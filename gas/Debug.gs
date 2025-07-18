/**
 * デバッグ用関数
 */

/**
 * スプレッドシートの接続テスト
 */
function testSpreadsheetConnection() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ スプレッドシートに接続成功');
    console.log('スプレッドシート名:', ss.getName());
    console.log('スプレッドシートID:', ss.getId());
    
    // シート一覧を表示
    const sheets = ss.getSheets();
    console.log('\n📋 シート一覧:');
    sheets.forEach(sheet => {
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      console.log(`- ${sheet.getName()} (${lastRow}行 x ${lastCol}列)`);
    });
    
    return '接続成功';
  } catch (error) {
    console.error('❌ スプレッドシート接続エラー:', error);
    return 'エラー: ' + error.toString();
  }
}

/**
 * 質問一覧シートの内容を確認
 */
function checkQuestionSheet() {
  try {
    const sheetManager = new SheetManager();
    const sheet = sheetManager.questionSheet;
    
    console.log('\n📊 質問一覧シートの情報:');
    console.log('シート名:', sheet.getName());
    console.log('行数:', sheet.getLastRow());
    console.log('列数:', sheet.getLastColumn());
    
    // ヘッダーを確認
    if (sheet.getLastRow() > 0) {
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log('\nヘッダー:', headers);
    }
    
    // データを確認（最初の5行）
    if (sheet.getLastRow() > 1) {
      const dataRows = Math.min(5, sheet.getLastRow() - 1);
      const data = sheet.getRange(2, 1, dataRows, sheet.getLastColumn()).getValues();
      console.log('\n最初の' + dataRows + '件のデータ:');
      data.forEach((row, index) => {
        console.log(`${index + 1}:`, row);
      });
    } else {
      console.log('\nデータなし');
    }
    
    return '確認完了';
  } catch (error) {
    console.error('❌ シート確認エラー:', error);
    return 'エラー: ' + error.toString();
  }
}

/**
 * テスト質問を直接追加
 */
function addTestQuestionDirect() {
  try {
    const sheetManager = new SheetManager();
    
    const testQuestion = {
      id: Utilities.getUuid(),
      region: 'tokyo',
      category: 'ai',
      content: 'テスト質問: ' + new Date().toLocaleString('ja-JP'),
      author: 'デバッグユーザー',
      timestamp: new Date().toISOString(),
      status: 'new',
      processed: false,
      likes: 0
    };
    
    console.log('追加する質問:', testQuestion);
    
    sheetManager.addQuestion(testQuestion);
    
    console.log('✅ テスト質問を追加しました');
    console.log('ID:', testQuestion.id);
    
    // 追加後の確認
    const questions = sheetManager.getQuestions('all');
    const added = questions.find(q => q.id === testQuestion.id);
    
    if (added) {
      console.log('✅ 追加を確認しました:', added);
    } else {
      console.log('❌ 追加した質問が見つかりません');
    }
    
    return testQuestion;
  } catch (error) {
    console.error('❌ 質問追加エラー:', error);
    return 'エラー: ' + error.toString();
  }
}

/**
 * submitQuestion関数のテスト
 */
function testSubmitQuestion() {
  try {
    const testData = {
      region: 'osaka',
      category: 'education',
      content: 'submitQuestion関数のテスト: ' + new Date().toLocaleString('ja-JP'),
      author: 'テストユーザー'
    };
    
    console.log('テストデータ:', testData);
    
    const result = submitQuestion(testData);
    
    console.log('実行結果:', result);
    
    if (result.success) {
      console.log('✅ 質問投稿成功');
      console.log('質問ID:', result.questionId);
      
      // 投稿後の確認
      const questions = getQuestions('osaka');
      console.log('大阪の質問数:', questions.questions ? questions.questions.length : 0);
    } else {
      console.log('❌ 質問投稿失敗:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ submitQuestionテストエラー:', error);
    return 'エラー: ' + error.toString();
  }
}

/**
 * 現在の質問一覧を取得
 */
function getCurrentQuestions() {
  try {
    const result = getQuestions('all');
    
    if (result.success) {
      console.log('✅ 質問取得成功');
      console.log('質問数:', result.questions.length);
      
      if (result.questions.length > 0) {
        console.log('\n最新の5件:');
        result.questions.slice(0, 5).forEach((q, i) => {
          const content = q.content || '(内容なし)';
          const displayContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
          console.log(`${i + 1}. [${q.region}/${q.category}] ${displayContent}`);
          console.log(`   投稿者: ${q.author}, 時間: ${q.timestamp}`);
        });
      }
    } else {
      console.log('❌ 質問取得失敗:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 質問取得エラー:', error);
    return 'エラー: ' + error.toString();
  }
}

/**
 * 権限の確認
 */
function checkPermissions() {
  console.log('=== 権限チェック開始 ===');
  
  // 1. スプレッドシートアクセス
  try {
    SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('✅ スプレッドシートアクセス: OK');
  } catch (error) {
    console.error('❌ スプレッドシートアクセス: NG', error);
  }
  
  // 2. PropertiesService
  try {
    const props = PropertiesService.getScriptProperties();
    const keys = props.getKeys();
    console.log('✅ PropertiesService: OK');
    console.log('設定されているキー:', keys);
  } catch (error) {
    console.error('❌ PropertiesService: NG', error);
  }
  
  // 3. UrlFetchApp (Gemini API用)
  try {
    const response = UrlFetchApp.fetch('https://www.google.com', {
      muteHttpExceptions: true,
      method: 'get'
    });
    console.log('✅ UrlFetchApp: OK (status: ' + response.getResponseCode() + ')');
  } catch (error) {
    console.error('❌ UrlFetchApp: NG', error);
  }
  
  console.log('=== 権限チェック完了 ===');
}

/**
 * 全体的な動作確認
 */
function runFullDiagnostics() {
  console.log('========== 診断開始 ==========');
  console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
  console.log('スプレッドシートID:', SPREADSHEET_ID);
  
  // 1. 権限チェック
  console.log('\n【1. 権限チェック】');
  checkPermissions();
  
  // 2. スプレッドシート接続
  console.log('\n【2. スプレッドシート接続】');
  testSpreadsheetConnection();
  
  // 3. シート内容確認
  console.log('\n【3. 質問シート確認】');
  checkQuestionSheet();
  
  // 4. 現在の質問一覧
  console.log('\n【4. 現在の質問一覧】');
  getCurrentQuestions();
  
  // 5. 質問投稿テスト
  console.log('\n【5. 質問投稿テスト】');
  testSubmitQuestion();
  
  console.log('\n========== 診断完了 ==========');
}