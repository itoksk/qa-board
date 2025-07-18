/**
 * 初期化用スクリプト
 */

/**
 * スプレッドシートの初期化を実行
 * この関数をGoogle Apps Scriptエディタから手動で実行してください
 */
function initializeSpreadsheet() {
  try {
    console.log('スプレッドシートの初期化を開始します...');
    
    // SheetManagerのインスタンスを作成（これが自動的にシートを初期化）
    const sheetManager = new SheetManager();
    
    console.log('✅ 質問一覧シートを作成/確認しました');
    console.log('✅ 代表質問シートを作成/確認しました');
    console.log('✅ 地域別シートを作成/確認しました');
    
    // テストデータを追加（オプション）
    const addTestData = Browser.msgBox(
      '初期化完了', 
      'シートの初期化が完了しました。\\nテストデータを追加しますか？', 
      Browser.Buttons.YES_NO
    );
    
    if (addTestData === Browser.Buttons.YES) {
      addSampleQuestions();
      console.log('✅ テストデータを追加しました');
    }
    
    return '初期化が完了しました';
    
  } catch (error) {
    console.error('初期化エラー:', error);
    throw error;
  }
}

/**
 * サンプル質問データを追加
 */
function addSampleQuestions() {
  const sheetManager = new SheetManager();
  
  const sampleQuestions = [
    {
      region: 'tokyo',
      category: 'ai',
      content: 'ChatGPTを授業で活用する際の注意点は何ですか？',
      author: '山田太郎'
    },
    {
      region: 'osaka',
      category: 'education',
      content: 'プログラミング教育にAIツールをどう組み込めばよいでしょうか？',
      author: '佐藤花子'
    },
    {
      region: 'nagoya',
      category: 'ict',
      content: 'オンライン授業の効果的な進め方を教えてください',
      author: '匿名'
    },
    {
      region: 'fukuoka',
      category: 'ai',
      content: '生成AIの倫理的な使用について生徒にどう教えるべきですか？',
      author: '鈴木一郎'
    },
    {
      region: 'hiroshima',
      category: 'other',
      content: 'ICT機器の導入コストを抑える方法はありますか？',
      author: '匿名'
    }
  ];
  
  sampleQuestions.forEach(q => {
    const question = {
      id: Utilities.getUuid(),
      region: q.region,
      category: q.category,
      content: q.content,
      author: q.author,
      timestamp: new Date().toISOString(),
      status: 'new',
      processed: false,
      likes: Math.floor(Math.random() * 10)
    };
    
    sheetManager.addQuestion(question);
  });
}

/**
 * Gemini APIキーの設定確認
 */
function checkGeminiApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  if (!apiKey) {
    Browser.msgBox(
      'APIキー未設定',
      'Gemini APIキーが設定されていません。\\n' +
      'スクリプトエディタの「プロジェクトの設定」→「スクリプトプロパティ」から\\n' +
      'GEMINI_API_KEYを設定してください。',
      Browser.Buttons.OK
    );
    return false;
  }
  
  Browser.msgBox(
    'APIキー確認',
    'Gemini APIキーが設定されています。\\n' +
    'キーの最初の8文字: ' + apiKey.substring(0, 8) + '...',
    Browser.Buttons.OK
  );
  
  return true;
}

/**
 * 完全な初期セットアップ
 */
function runCompleteSetup() {
  console.log('=== QA Board 初期セットアップ開始 ===');
  
  // 1. スプレッドシートの初期化
  initializeSpreadsheet();
  
  // 2. APIキーの確認
  checkGeminiApiKey();
  
  // 3. 権限の確認
  try {
    // スプレッドシートへのアクセス権限テスト
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ スプレッドシートへのアクセス権限: OK');
    
    // URLフェッチの権限テスト（Gemini API用）
    const testUrl = 'https://www.google.com';
    const response = UrlFetchApp.fetch(testUrl, {muteHttpExceptions: true});
    console.log('✅ 外部APIへのアクセス権限: OK');
    
  } catch (error) {
    console.error('❌ 権限エラー:', error);
    Browser.msgBox(
      'エラー',
      '必要な権限が付与されていません。\\n' + error.toString(),
      Browser.Buttons.OK
    );
    return;
  }
  
  console.log('=== セットアップ完了 ===');
  
  Browser.msgBox(
    'セットアップ完了',
    'QA Boardの初期セットアップが完了しました！\\n\\n' +
    '次のステップ:\\n' +
    '1. デプロイ → 新しいデプロイ\\n' +
    '2. 種類: ウェブアプリ\\n' +
    '3. アクセス権: 全員\\n' +
    '4. デプロイをクリック',
    Browser.Buttons.OK
  );
}