# QA Board - 教育イベント質問集約システム

## 概要

QA Boardは、教育イベントで参加者から質問を収集し、K-Means クラスタリングとGemini APIを使用して代表的な質問を自動生成するWebアプリケーションです。Google Apps Script (GAS) で構築され、Google Sheetsをデータベースとして使用します。

## 主な機能

- 🎯 **リアルタイム質問収集**: 参加者が質問を投稿できるWebインターフェース
- 🌏 **地域別管理**: 大阪、名古屋、福岡、広島、東京の5地域に対応
- 🤖 **AI質問集約**: K-Meansクラスタリングで類似質問をグループ化し、Gemini APIで代表質問を生成
- 👍 **いいね機能**: 質問への共感度を可視化
- 🔐 **管理者機能**: パスワード保護された代表質問生成機能
- 📊 **スプレッドシート連携**: Google Sheetsでデータを永続化

## システム構成

```
qa-board/
├── gas/                    # Google Apps Scriptファイル
│   ├── Code.gs            # メインエントリーポイント
│   ├── SheetManager.gs    # スプレッドシート操作
│   ├── QuestionClusterer.gs # K-Meansクラスタリング実装
│   ├── GeminiService.gs   # Gemini API連携
│   ├── Initialize.gs      # 初期設定スクリプト
│   ├── Debug.gs           # デバッグ用ユーティリティ
│   ├── TestSheet.gs       # テスト関数
│   └── appsscript.json    # GASマニフェスト
├── html/                   # HTMLテンプレート
│   ├── index_gas.html     # メインHTML
│   ├── styles.html        # CSSスタイル
│   └── javascript.html    # クライアントサイドJS
├── docs/                   # ドキュメント
│   ├── REQUIREMENTS.md    # 要件定義
│   ├── GAS_ARCHITECTURE.md # システムアーキテクチャ
│   ├── ML_ALGORITHM.md    # 機械学習アルゴリズム詳細
│   └── GEMINI_INTEGRATION.md # Gemini API統合ガイド
└── README.md              # このファイル
```

## セットアップ手順

### 1. Google スプレッドシートの準備

1. 新しいGoogle スプレッドシートを作成
2. スプレッドシートIDをメモ（URLの`/d/`と`/edit`の間の文字列）

### 2. Google Apps Scriptプロジェクトの作成

1. [Google Apps Script](https://script.google.com)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「QA Board」に設定

### 3. ファイルのアップロード

1. `gas/`フォルダ内のすべての`.gs`ファイルをGASプロジェクトに追加
2. `html/`フォルダ内のHTMLファイルをHTMLファイルとして追加
3. `appsscript.json`の内容でマニフェストを更新

### 4. 設定の更新

`Code.gs`の以下の定数を更新：
```javascript
const SPREADSHEET_ID = 'あなたのスプレッドシートID';
const ADMIN_PASSWORD = '新しい管理者パスワード';
```

### 5. Gemini API キーの設定

1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを取得
2. GASプロジェクトのプロパティに設定：
   - プロジェクト設定 > スクリプトプロパティ
   - プロパティ名: `GEMINI_API_KEY`
   - 値: 取得したAPIキー

### 6. 初期化スクリプトの実行

GASエディタで以下の関数を実行：
1. `initializeSpreadsheet()` - スプレッドシートの初期設定
2. `testSpreadsheetConnection()` - 接続確認

### 7. Webアプリのデプロイ

1. デプロイ > 新しいデプロイ
2. 種類: Webアプリ
3. 実行ユーザー: 自分
4. アクセス権: 全員
5. デプロイをクリック

## 使い方

### 参加者向け

1. WebアプリのURLにアクセス
2. 「質問を投稿する」をクリック
3. 地域、カテゴリ、質問内容を入力して送信
4. 「質問一覧を見る」で投稿された質問を確認
5. 共感する質問に「いいね」

### 管理者向け

1. 「代表質問を生成」をクリック
2. 管理者パスワードを入力
3. 対象地域を選択して生成実行
4. 「生成された代表質問」で結果を確認

## 技術仕様

### 使用技術
- **バックエンド**: Google Apps Script (V8ランタイム)
- **フロントエンド**: HTML5, Tailwind CSS, Vanilla JavaScript
- **データストア**: Google Sheets
- **AI/ML**: 
  - K-Meansクラスタリング（GAS内で実装）
  - Google Gemini API (gemini-1.5-flash)

### データ構造

#### 質問データ
```javascript
{
  id: string,          // UUID
  region: string,      // osaka|nagoya|fukuoka|hiroshima|tokyo
  category: string,    // ai|education|ict|other
  content: string,     // 質問内容
  author: string,      // 投稿者名（任意）
  timestamp: string,   // ISO 8601形式
  status: string,      // new|processed
  processed: boolean,  // 処理済みフラグ
  likes: number        // いいね数
}
```

#### 代表質問データ
```javascript
{
  id: string,           // UUID
  region: string,       // 地域コード
  question: string,     // 生成された代表質問
  category: string,     // カテゴリ
  clusterSize: number,  // クラスタ内の質問数
  sourceIds: string[],  // 元質問のID配列
  generatedAt: string,  // 生成日時
  method: string        // 生成方法（"Gemini API"）
}
```

## トラブルシューティング

### 質問が表示されない場合
1. `Debug.gs`の`runFullDiagnostics()`を実行
2. スプレッドシートの権限を確認
3. シート名が正しいか確認（「質問一覧」）

### Gemini API エラー
1. APIキーが正しく設定されているか確認
2. APIの利用上限を確認
3. `testGeminiConnection()`で接続テスト

### いいね機能が動作しない
1. 質問IDが正しく設定されているか確認
2. `inspectSheetData()`でデータ構造を確認

## 開発者向け情報

### デバッグ機能
- `Debug.gs`に各種診断関数を用意
- `runFullDiagnostics()`: 全体診断
- `testSpreadsheetConnection()`: 接続テスト
- `checkQuestionSheet()`: データ確認

### カスタマイズポイント
- 地域の追加: `Code.gs`の地域配列を更新
- カテゴリの追加: カテゴリ配列を更新
- UIテーマ: `styles.html`でTailwind設定を変更
- クラスタリング調整: `QuestionClusterer.gs`のパラメータ

## ライセンス

このプロジェクトは教育目的で作成されました。

## 作成者

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>