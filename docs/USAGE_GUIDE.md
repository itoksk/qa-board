# QA Board 使用ガイド

このガイドでは、QA Boardシステムの実際の使い方を説明します。

## 目次

1. [一般参加者向け](#一般参加者向け)
2. [管理者向け](#管理者向け)
3. [よくある質問と回答](#よくある質問と回答)

## 一般参加者向け

### 質問を投稿する

1. **QA BoardのURLにアクセス**
   - 主催者から提供されたWebアプリのURLを開きます
   - スマートフォン、タブレット、PCどれでもアクセス可能です

2. **質問投稿フォームを開く**
   - 「質問を投稿する」ボタンをクリック
   - フォームが表示されます

3. **必要事項を入力**
   - **地域**: あなたが参加しているイベントの地域を選択
     - 大阪、名古屋、福岡、広島、東京から選択
   - **カテゴリ**: 質問の種類を選択
     - 生成AI: ChatGPT、Gemini、Claude等のAIツールに関する質問
     - 教育: 教育方法、アクティブラーニング、評価方法等
     - ICT: タブレット、デジタル教科書、オンライン授業等
     - その他: 上記に当てはまらない質問
   - **質問内容**: 具体的な質問を入力
   - **投稿者名**: 任意（空欄の場合は「匿名」として記録）

4. **送信**
   - 「送信」ボタンをクリック
   - 「質問を投稿しました」というメッセージが表示されたら成功

### 質問を閲覧する

1. **「質問一覧を見る」をクリック**

2. **フィルター機能を活用**
   - 地域フィルター: 特定の地域の質問のみ表示
   - カテゴリフィルター: 特定のカテゴリの質問のみ表示
   - 両方を組み合わせることも可能

3. **質問カードの見方**
   - 上部: カテゴリバッジと投稿時刻
   - 中央: 質問内容
   - 下部: 投稿者名といいねボタン

### いいね機能の使い方

1. **共感する質問を見つける**
   - 「これ、私も聞きたかった！」と思う質問を探します

2. **いいねボタンをクリック**
   - 👍 アイコンをクリック
   - クリックすると ❤️ に変わり、いいね数が増えます
   - アニメーション効果で視覚的にフィードバック

3. **いいねの取り消し**
   - もう一度クリックすると取り消せます
   - ただし、すでにいいねした質問は振動エフェクトで知らせます

4. **いいねの永続化**
   - いいねはブラウザに記憶されます
   - 同じデバイス・ブラウザなら、後で見てもいいね状態が保持されます

## 管理者向け

### 初期設定

管理者として使用する前に、以下の設定が完了していることを確認してください：

1. Google Apps Scriptのスクリプトプロパティに以下が設定されている
   - `SPREADSHEET_ID`: データ保存用のスプレッドシートID
   - `ADMIN_PASSWORD`: 管理者パスワード
   - `GEMINI_API_KEY`: Gemini APIキー

### 代表質問の生成

1. **管理者機能にアクセス**
   - 「代表質問を生成」ボタンをクリック

2. **パスワード認証**
   - 設定した管理者パスワードを入力
   - 「確認」をクリック

3. **生成オプションの選択**
   - **対象地域**: 処理する地域を選択（「全地域」も可）
   - **強制再生成**: チェックすると、処理済みの質問も含めて再生成
   - **カテゴリをまたぐ**: チェックすると、異なるカテゴリの類似質問も統合

4. **生成実行**
   - 「生成開始」をクリック
   - 処理中は進捗が表示されます
   - 完了すると結果サマリーが表示されます

### 生成された代表質問の確認

1. **「生成された代表質問」タブを開く**

2. **代表質問カードの見方**
   - **ヘッダー**: 地域とカテゴリ、クラスタサイズ
   - **本文**: AIが生成した代表質問（省略なしの完全版）
   - **元の質問**: クリックで展開し、統合された元の質問を確認
   - **フッター**: 生成日時と生成方法（gemini/fallback）

3. **フィルター機能**
   - 地域別に絞り込み可能
   - 生成日時順に自動ソート

### データ管理

1. **Google Sheetsでの直接確認**
   - スプレッドシートには以下のシートが作成されます：
     - 質問一覧: すべての質問データ
     - 代表質問: 生成された代表質問
     - 質問_[地域名]: 地域別の質問データ

2. **データのエクスポート**
   - Google Sheetsから直接CSV/Excelファイルとしてダウンロード可能

3. **処理状態の管理**
   - 処理済みフラグで、どの質問が代表質問生成に使用されたか追跡
   - 必要に応じて手動でフラグをリセット可能

## よくある質問と回答

### Q: 質問が表示されません

A: 以下を確認してください：
- ページを再読み込みしてみる
- フィルターが適用されていないか確認
- ネットワーク接続を確認

### Q: いいねしたのに数字が増えません

A: いいねは即座に反映されますが、以下の場合は更新されないことがあります：
- すでにいいねした質問（振動エフェクトで通知）
- ネットワークエラー（エラーメッセージを確認）

### Q: 代表質問が長すぎるまたは短すぎます

A: 代表質問は50-80文字程度を目安に生成されます。強制再生成で最新の生成ロジックを適用してください。

### Q: カテゴリが違うのに似た質問があります

A: 「カテゴリをまたぐ」オプションを有効にして代表質問を生成すると、カテゴリに関係なく類似質問が統合されます。

### Q: 生成された代表質問が元の質問の意図を反映していません

A: 最新版ではクラスタ内の全質問の核心的な意図を抽出して反映するよう改善されています。強制再生成をお試しください。

### Q: エラーが発生しました

A: 以下の情報と共に管理者に連絡してください：
- エラーメッセージの内容
- 実行していた操作
- 使用しているブラウザとデバイス

## ベストプラクティス

### 質問投稿時のコツ

1. **具体的に質問する**
   - 良い例: 「ChatGPTを中学校の英語授業で使う際の注意点は？」
   - 悪い例: 「AIについて教えてください」

2. **適切なカテゴリを選ぶ**
   - 迷った場合は最も近いものを選択
   - どれにも当てはまらない場合は「その他」

3. **背景情報を含める**
   - 対象学年、教科、具体的な場面などを含めると、より有用な代表質問が生成されます

### 管理者向けのコツ

1. **定期的な代表質問生成**
   - イベント中は1-2時間ごとに生成を実行
   - 質問が少ない場合は手動でタイミングを調整

2. **カテゴリをまたぐオプションの活用**
   - 類似テーマが複数カテゴリに分散している場合に有効
   - 最初は無効で実行し、必要に応じて有効化
   - 例：「ChatGPT」関連の質問がAIカテゴリとICTカテゴリに分かれている場合

3. **生成結果の確認**
   - 生成された代表質問が適切か確認
   - 長さ：50-80文字程度が理想的
   - 内容：クラスタ内の全質問の意図が反映されているか
   - 不適切な場合は、元の質問を確認して原因を特定

## サポート

技術的な問題が発生した場合は、以下の情報を準備して管理者に連絡してください：

- 問題の詳細な説明
- エラーメッセージ（表示されている場合）
- スクリーンショット（可能であれば）
- 使用環境（OS、ブラウザ、デバイス）

---

最終更新日: 2025年7月18日