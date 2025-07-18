# QA Board - Google Apps Script アーキテクチャ仕様書

## 1. 概要

QA Boardシステム全体をGoogle Apps Script (GAS)で実装します。GASを使用することで、Google Sheetsとの自然な統合、サーバーレス運用、コスト削減が実現できます。

## 2. システム構成

### 2.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                    ユーザー (ブラウザ)                   │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│              Google Apps Script Web App              │
│  ┌─────────────────┐  ┌────────────────────────┐  │
│  │   HTML Service   │  │    Server-side GAS     │  │
│  │  (index.html)    │◀▶│  - doGet()            │  │
│  │  - Tailwind CSS  │  │  - doPost()           │  │
│  └─────────────────┘  │  - API endpoints       │  │
│                        └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Google Sheets │  │  Gemini API   │  │   Properties  │
│ (データ永続化)  │  │ (質問要約)     │  │  Service      │
└───────────────┘  └───────────────┘  └───────────────┘
```

### 2.2 ファイル構成

```
qa-board/
├── Code.gs              # メインのサーバーサイドコード
├── ApiHandlers.gs       # APIエンドポイントハンドラ
├── SheetManager.gs      # スプレッドシート操作
├── QuestionClusterer.gs # 質問クラスタリング処理
├── GeminiService.gs     # Gemini API連携
├── Utils.gs             # ユーティリティ関数
├── index.html           # メインHTML（既存）
├── styles.html          # CSS（Tailwind CDN）
├── javascript.html      # クライアントサイドJS
└── appsscript.json      # GASマニフェスト
```

## 3. 実装詳細

### 3.1 メインコード (Code.gs)

```javascript
// グローバル設定
const SPREADSHEET_ID = '1Fr8mA0Kfcz_emCpFH1V7yDiytyxiuLTEcPWD0ifn_q0';
const ADMIN_PASSWORD = 'ictedu';

/**
 * Webアプリのエントリーポイント
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.data = {
    spreadsheetId: SPREADSHEET_ID
  };
  
  return template.evaluate()
    .setTitle('QA Board - 教育イベント質問集約システム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://www.google.com/favicon.ico');
}

/**
 * POSTリクエストハンドラ
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'submitQuestion':
        return handleSubmitQuestion(data);
      case 'getQuestions':
        return handleGetQuestions(data);
      case 'generateRepresentative':
        return handleGenerateRepresentative(data);
      case 'verifyPassword':
        return handleVerifyPassword(data);
      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTMLファイルのインクルード
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### 3.2 APIハンドラ (ApiHandlers.gs)

```javascript
/**
 * 質問投稿処理
 */
function handleSubmitQuestion(data) {
  const sheetManager = new SheetManager();
  
  const question = {
    id: Utilities.getUuid(),
    region: data.region,
    category: data.category,
    content: data.content,
    author: data.author || '匿名',
    timestamp: new Date().toISOString(),
    status: 'new',
    processed: false,
    likes: 0
  };
  
  sheetManager.addQuestion(question);
  
  return createJsonResponse({
    success: true,
    questionId: question.id
  });
}

/**
 * 質問一覧取得
 */
function handleGetQuestions(data) {
  const sheetManager = new SheetManager();
  const region = data.region || 'all';
  
  const questions = sheetManager.getQuestions(region);
  
  return createJsonResponse({
    success: true,
    questions: questions
  });
}

/**
 * 代表質問生成
 */
function handleGenerateRepresentative(data) {
  // パスワード検証
  if (data.password !== ADMIN_PASSWORD) {
    return createJsonResponse({
      success: false,
      error: 'Invalid password'
    });
  }
  
  const clusterer = new QuestionClusterer();
  const results = clusterer.processQuestions(
    data.region,
    data.forceRegenerate
  );
  
  return createJsonResponse({
    success: true,
    results: results
  });
}

/**
 * JSONレスポンス生成
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### 3.3 スプレッドシート管理 (SheetManager.gs)

```javascript
class SheetManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    this.initSheets();
  }
  
  /**
   * シートの初期化
   */
  initSheets() {
    // 質問シート
    this.questionSheet = this.getOrCreateSheet('質問一覧', [
      'ID', '地域', 'カテゴリ', '質問内容', '投稿者', 
      'タイムスタンプ', 'ステータス', '処理済み', 'いいね数'
    ]);
    
    // 代表質問シート
    this.representativeSheet = this.getOrCreateSheet('代表質問', [
      'ID', '地域', '代表質問', 'クラスタサイズ', 
      '元質問ID', '生成日時', '生成方法'
    ]);
  }
  
  /**
   * シート取得または作成
   */
  getOrCreateSheet(sheetName, headers) {
    let sheet = this.spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  }
  
  /**
   * 質問追加
   */
  addQuestion(question) {
    const row = [
      question.id,
      question.region,
      question.category,
      question.content,
      question.author,
      question.timestamp,
      question.status,
      question.processed,
      question.likes
    ];
    
    this.questionSheet.appendRow(row);
  }
  
  /**
   * 質問取得
   */
  getQuestions(region = 'all') {
    const data = this.questionSheet.getDataRange().getValues();
    const headers = data[0];
    const questions = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const question = {};
      
      headers.forEach((header, index) => {
        question[this.toCamelCase(header)] = row[index];
      });
      
      if (region === 'all' || question.region === region) {
        questions.push(question);
      }
    }
    
    return questions;
  }
  
  /**
   * 代表質問保存
   */
  saveRepresentativeQuestions(representatives) {
    const rows = representatives.map(rep => [
      Utilities.getUuid(),
      rep.region,
      rep.question,
      rep.clusterSize,
      rep.sourceIds.join(','),
      new Date().toISOString(),
      'Gemini API'
    ]);
    
    if (rows.length > 0) {
      this.representativeSheet.getRange(
        this.representativeSheet.getLastRow() + 1,
        1,
        rows.length,
        rows[0].length
      ).setValues(rows);
    }
  }
  
  /**
   * ヘッダー名をキャメルケースに変換
   */
  toCamelCase(str) {
    return str.replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
      .replace(/^./, (match) => match.toLowerCase());
  }
}
```

### 3.4 質問クラスタリング (QuestionClusterer.gs)

```javascript
class QuestionClusterer {
  constructor() {
    this.geminiService = new GeminiService();
    this.sheetManager = new SheetManager();
  }
  
  /**
   * 質問処理メイン
   */
  processQuestions(region, forceRegenerate) {
    // 質問取得
    let questions = this.sheetManager.getQuestions(region);
    
    // 未処理のみフィルタ（強制再生成でない場合）
    if (!forceRegenerate) {
      questions = questions.filter(q => !q.processed);
    }
    
    if (questions.length === 0) {
      return { message: '処理対象の質問がありません' };
    }
    
    // 簡易クラスタリング（カテゴリベース）
    const clusters = this.clusterByCategory(questions);
    
    // 各クラスタから代表質問生成
    const representatives = [];
    
    for (const [category, clusterQuestions] of Object.entries(clusters)) {
      if (clusterQuestions.length > 0) {
        const representative = this.generateRepresentative(
          clusterQuestions,
          category,
          region
        );
        representatives.push(representative);
      }
    }
    
    // 結果を保存
    this.sheetManager.saveRepresentativeQuestions(representatives);
    
    // 処理済みフラグ更新
    this.markQuestionsAsProcessed(questions);
    
    return {
      processedCount: questions.length,
      representativeCount: representatives.length,
      representatives: representatives
    };
  }
  
  /**
   * カテゴリベースのクラスタリング
   */
  clusterByCategory(questions) {
    const clusters = {};
    
    questions.forEach(q => {
      if (!clusters[q.category]) {
        clusters[q.category] = [];
      }
      clusters[q.category].push(q);
    });
    
    return clusters;
  }
  
  /**
   * 代表質問生成
   */
  generateRepresentative(questions, category, region) {
    const questionTexts = questions.map(q => q.content);
    
    // Gemini APIで要約
    const summary = this.geminiService.generateSummary(
      questionTexts,
      category,
      region
    );
    
    return {
      region: region,
      category: category,
      question: summary,
      clusterSize: questions.length,
      sourceIds: questions.map(q => q.id)
    };
  }
  
  /**
   * 処理済みフラグ更新
   */
  markQuestionsAsProcessed(questions) {
    const sheet = this.sheetManager.questionSheet;
    const data = sheet.getDataRange().getValues();
    
    questions.forEach(q => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === q.id) {  // IDで一致確認
          sheet.getRange(i + 1, 8).setValue(true);  // 処理済み列を更新
          break;
        }
      }
    });
  }
}
```

### 3.5 Gemini API連携 (GeminiService.gs)

```javascript
class GeminiService {
  constructor() {
    // PropertiesServiceからAPIキー取得
    this.apiKey = PropertiesService.getScriptProperties()
      .getProperty('GEMINI_API_KEY');
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }
  
  /**
   * 質問要約生成
   */
  generateSummary(questions, category, region) {
    const prompt = `
あなたは教育イベントの質問を分析する専門家です。
以下は${region}地域の${category}カテゴリーに関する質問群です。

これらの質問に共通する本質的な疑問や関心事を理解し、
それを的確に表現する代表的な質問を1つ生成してください。

要件：
- 30文字以内で簡潔に
- 専門用語は避け、分かりやすい表現で
- 質問の核心を捉える
- 「〜ですか？」「〜でしょうか？」の形式で

質問群：
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

代表質問：`;

    try {
      const response = UrlFetchApp.fetch(this.apiUrl + '?key=' + this.apiKey, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 100
          }
        })
      });
      
      const result = JSON.parse(response.getContentText());
      return result.candidates[0].content.parts[0].text.trim();
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      // フォールバック：最初の質問を返す
      return questions[0];
    }
  }
}
```

### 3.6 HTMLテンプレート更新

index.htmlの更新（GAS用）:

```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <?!= include('styles'); ?>
  </head>
  <body>
    <!-- 既存のHTMLコンテンツ -->
    <!-- ... -->
    
    <?!= include('javascript'); ?>
  </body>
</html>
```

### 3.7 クライアントサイドJS (javascript.html)

```html
<script>
// Google Apps Script APIとの通信
const GAS_API = {
  // 質問投稿
  submitQuestion: async (data) => {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .submitQuestion(data);
    });
  },
  
  // 質問取得
  getQuestions: async (region) => {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .getQuestions(region);
    });
  },
  
  // 代表質問生成
  generateRepresentative: async (region, password, forceRegenerate) => {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        .generateRepresentative(region, password, forceRegenerate);
    });
  }
};

// 既存のJavaScript関数を更新
async function submitQuestionForm(e) {
  e.preventDefault();
  
  const formData = {
    region: document.querySelector('[name="region"]').value,
    category: document.querySelector('[name="category"]').value,
    content: document.querySelector('[name="content"]').value,
    author: document.querySelector('[name="author"]').value
  };
  
  try {
    const result = await GAS_API.submitQuestion(formData);
    if (result.success) {
      alert('質問を送信しました');
      // フォームリセット
      e.target.reset();
    }
  } catch (error) {
    alert('エラーが発生しました: ' + error);
  }
}

// その他の関数も同様に更新...
</script>
```

## 4. デプロイ手順

### 4.1 初期セットアップ

1. Google Driveで新規Google Apps Scriptプロジェクト作成
2. 各.gsファイルのコードをコピー
3. HTMLファイルをプロジェクトに追加
4. Gemini APIキーをPropertiesに設定:
   ```javascript
   PropertiesService.getScriptProperties()
     .setProperty('GEMINI_API_KEY', 'your-api-key');
   ```

### 4.2 Webアプリとしてデプロイ

1. デプロイ > 新しいデプロイ
2. 種類: Webアプリ
3. 実行ユーザー: 自分
4. アクセス権: 全員

### 4.3 権限設定

必要な権限:
- Google Sheets API
- URL Fetch (Gemini API用)
- Script Properties

## 5. 制限事項と対策

### 5.1 GASの制限

- **実行時間**: 6分（対策: バッチ処理）
- **URLフェッチ**: 20MB/日（対策: キャッシュ）
- **同時実行**: 30（対策: キュー実装）

### 5.2 パフォーマンス最適化

```javascript
// キャッシュ実装例
function getCachedQuestions(region) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `questions_${region}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const questions = new SheetManager().getQuestions(region);
  cache.put(cacheKey, JSON.stringify(questions), 300); // 5分キャッシュ
  
  return questions;
}
```

## 6. セキュリティ考慮事項

1. **入力検証**: XSS対策
2. **レート制限**: DoS対策
3. **認証**: 管理機能のパスワード保護
4. **HTTPS**: GASは自動的にHTTPS

---

**文書情報**
- バージョン: 1.0
- 作成日: 2025年7月17日
- 最終更新: 2025年7月17日