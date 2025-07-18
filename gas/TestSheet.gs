/**
 * シート関連のテスト関数
 */

/**
 * 現在のシートデータを詳細に確認
 */
function inspectSheetData() {
  try {
    const sheetManager = new SheetManager();
    const sheet = sheetManager.questionSheet;
    
    console.log('=== シートデータ詳細確認 ===');
    
    // 全データを取得
    const range = sheet.getDataRange();
    const values = range.getValues();
    
    console.log('データ範囲:', range.getA1Notation());
    console.log('行数:', values.length);
    console.log('列数:', values[0] ? values[0].length : 0);
    
    // ヘッダーを表示
    if (values.length > 0) {
      console.log('\nヘッダー行:');
      values[0].forEach((header, index) => {
        console.log(`  列${index + 1}: "${header}"`);
      });
    }
    
    // データ行を表示
    if (values.length > 1) {
      console.log('\nデータ行:');
      for (let i = 1; i < values.length; i++) {
        console.log(`\n行${i + 1}:`);
        values[0].forEach((header, colIndex) => {
          console.log(`  ${header}: ${JSON.stringify(values[i][colIndex])}`);
        });
      }
    }
    
    // getQuestions()の結果も確認
    console.log('\n=== getQuestions()の結果 ===');
    const questions = sheetManager.getQuestions('all');
    console.log('取得した質問数:', questions.length);
    
    if (questions.length > 0) {
      console.log('\n最初の質問:');
      console.log(JSON.stringify(questions[0], null, 2));
    }
    
    return '確認完了';
  } catch (error) {
    console.error('エラー:', error);
    return error.toString();
  }
}

/**
 * データ変換のテスト
 */
function testDataConversion() {
  const sheetManager = new SheetManager();
  
  console.log('=== ヘッダー名変換テスト ===');
  
  const testHeaders = [
    'ID', '地域', 'カテゴリ', '質問内容', '投稿者',
    'タイムスタンプ', 'ステータス', '処理済み', 'いいね数'
  ];
  
  testHeaders.forEach(header => {
    const converted = sheetManager.toCamelCase(header);
    console.log(`"${header}" → "${converted}"`);
  });
}

/**
 * 手動でデータを再構築
 */
function rebuildQuestionData() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('質問一覧');
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('データがありません');
      return;
    }
    
    const questions = [];
    for (let i = 1; i < data.length; i++) {
      const question = {
        id: data[i][0],
        region: data[i][1],
        category: data[i][2],
        content: data[i][3],
        author: data[i][4],
        timestamp: data[i][5],
        status: data[i][6],
        processed: data[i][7],
        likes: data[i][8] || 0
      };
      questions.push(question);
    }
    
    console.log('再構築した質問データ:');
    console.log(JSON.stringify(questions, null, 2));
    
    return questions;
  } catch (error) {
    console.error('エラー:', error);
    return [];
  }
}