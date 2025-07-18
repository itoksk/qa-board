# QA Board - 教育イベント質問集約システム

教育関連のイベントで参加者から集めた質問を地域・カテゴリ別に整理し、AIを活用して代表的な質問を自動生成するシステムです。

## 概要

このシステムは、大規模な教育イベントで寄せられる多数の質問を効率的に管理・分析するために開発されました。Google Apps Script (GAS) で構築され、Google Sheetsをデータベースとして使用します。

## 主な機能

- 🌏 **地域別管理**: 大阪、名古屋、福岡、広島、東京の5地域に対応
- 📁 **カテゴリ分類**: 生成AI、教育、ICT、その他の4カテゴリ
- 🤖 **AI要約**: TF-IDFとK-Meansクラスタリングで類似質問を自動分析し、Gemini APIで代表質問を生成
- 👍 **いいね機能**: 参加者が共感する質問に「いいね」を付けられる（絵文字アイコン対応）
- 🔐 **管理者機能**: パスワード保護された管理画面
- 📊 **データ永続化**: Google Sheetsでデータを管理

## 技術スタック

- **バックエンド**: Google Apps Script (GAS)
- **フロントエンド**: HTML/CSS/JavaScript (Tailwind CSS)
- **データベース**: Google Sheets
- **AI**: Google Gemini API (gemini-1.5-flash)
- **機械学習**: TF-IDF + K-means クラスタリング（GAS内実装）

## システム構成

```
qa-board/
├── gas/                    # Google Apps Scriptファイル
│   ├── Code.gs            # メインエントリーポイント
│   ├── SheetManager.gs    # スプレッドシート操作
│   ├── QuestionClusterer.gs # K-Meansクラスタリング実装
│   ├── GeminiService.gs   # Gemini API連携
│   ├── TextVectorizer.gs  # TF-IDFベクトル化
│   ├── KMeansClusterer.gs # K-means実装
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

### 1. Google Sheetsの準備

1. 新しいGoogle Spreadsheetsを作成
2. スプレッドシートのIDをメモ（URLの`/d/`と`/edit`の間の文字列）

### 2. Google Apps Scriptプロジェクトの作成

1. [Google Apps Script](https://script.google.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクト名を「QA Board」に変更

### 3. スクリプトプロパティの設定

Google Apps Scriptエディタで以下の手順を実行：

1. プロジェクト設定（歯車アイコン）をクリック
2. 「スクリプト プロパティ」セクションまでスクロール
3. 「スクリプト プロパティを追加」をクリック
4. 以下のプロパティを追加：

| プロパティ名 | 値 | 説明 |
|------------|---|-----|
| `SPREADSHEET_ID` | `your-spreadsheet-id` | 手順1でメモしたID |
| `ADMIN_PASSWORD` | `your-secure-password` | 管理者パスワード |
| `GEMINI_API_KEY` | `your-gemini-api-key` | [Google AI Studio](https://makersuite.google.com/app/apikey)で取得 |

### 4. ソースコードのデプロイ

1. `gas/`フォルダ内のすべての`.gs`ファイルをGoogle Apps Scriptプロジェクトにコピー
   - `Code.gs` - メインコード
   - `SheetManager.gs` - スプレッドシート管理
   - `QuestionClusterer.gs` - 質問クラスタリング
   - `GeminiService.gs` - Gemini API連携
   - `TextVectorizer.gs` - テキストベクトル化
   - `KMeansClusterer.gs` - K-meansクラスタリング
   - その他のファイル

2. `html/`フォルダ内のHTMLファイルをHTMLファイルとして追加
   - `index_gas.html` - メインページ
   - `styles.html` - スタイルシート
   - `javascript.html` - クライアントサイドJS

### 5. 初期化の実行

1. Google Apps Scriptエディタで`Initialize.gs`を開く
2. `initializeSpreadsheet`関数を選択
3. 実行ボタン（▶️）をクリック
4. 権限を承認
5. テストデータを追加するか選択

### 6. Webアプリとしてデプロイ

1. 「デプロイ」→「新しいデプロイ」をクリック
2. 種類で「ウェブアプリ」を選択
3. 以下の設定：
   - 説明: 任意のバージョン説明
   - 実行ユーザー: 「自分」
   - アクセスできるユーザー: 「全員」
4. 「デプロイ」をクリック
5. 表示されたWebアプリのURLを保存

## 使い方

### 一般ユーザー向け

1. デプロイされたWebアプリのURLにアクセス
2. 地域とカテゴリを選択して質問を投稿
3. 他の参加者の質問を閲覧し、共感する質問に「いいね」（👍→❤️）

### 管理者向け

1. 管理者画面で設定したパスワードを入力
2. 「代表質問を生成」ボタンで、AIによる質問分析を実行
3. 生成された代表質問は自動的に表示される

## アーキテクチャ

### データフロー

```
参加者入力 → Google Sheets → クラスタリング処理 → Gemini API → 代表質問生成
```

### クラスタリングアルゴリズム

1. **前処理**: 日本語テキストの正規化とトークン化（bi-gram）
2. **ベクトル化**: TF-IDFによる特徴抽出
3. **クラスタリング**: K-means法（エルボー法で最適クラスタ数決定）
4. **代表質問生成**: 各クラスタの重心に最も近い質問を基に、Gemini APIで要約

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
  method: string        // 生成方法（gemini|fallback）
}
```

## トラブルシューティング

### エラー: SPREADSHEET_IDが設定されていません

スクリプトプロパティに`SPREADSHEET_ID`が正しく設定されているか確認してください。

### エラー: GEMINI_API_KEYが設定されていません

1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを取得
2. スクリプトプロパティに`GEMINI_API_KEY`を設定

### Gemini APIエラー (404: models/gemini-pro is not found)

最新の`gemini-1.5-flash`モデルを使用しているか確認してください。

### いいね機能が動作しない

- LocalStorageが有効か確認
- 質問IDが正しく設定されているか確認

## 開発者向け情報

### プロジェクト構造

```
qa-board/
├── gas/                    # Google Apps Script用ファイル
│   ├── Code.gs            # メインコード
│   ├── SheetManager.gs    # データ管理
│   ├── QuestionClusterer.gs # クラスタリング処理
│   ├── TextVectorizer.gs  # TF-IDFベクトル化
│   ├── KMeansClusterer.gs # K-means実装
│   └── ...
├── html/                   # フロントエンド用ファイル
│   ├── index_gas.html     # メインHTML
│   ├── styles.html        # CSS
│   └── javascript.html    # JavaScript
└── docs/                   # ドキュメント
    ├── ML_ALGORITHM.md    # MLアルゴリズム詳細
    └── GAS_ARCHITECTURE.md # システム設計
```

### テスト関数

開発時に以下のテスト関数が利用可能：

- `testSpreadsheetConnection()` - スプレッドシート接続テスト
- `testVectorClustering()` - ベクトル化・クラスタリングテスト
- `analyzeQuestionData()` - 質問データ分析
- `addSimilarTestQuestions()` - テストデータ追加

## 貢献方法

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 謝辞

- Google Gemini APIチーム
- 教育イベント参加者の皆様
- オープンソースコミュニティ