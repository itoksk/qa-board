/**
 * スプレッドシート管理クラス
 */
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
      'ID', '地域', '代表質問', 'カテゴリ', 'クラスタサイズ', 
      '元質問ID', '生成日時', '生成方法'
    ]);
    
    // 地域別シートも作成
    const regions = ['大阪', '名古屋', '福岡', '広島', '東京'];
    regions.forEach(region => {
      this.getOrCreateSheet(`質問_${region}`, [
        'ID', 'カテゴリ', '質問内容', '投稿者', 
        'タイムスタンプ', 'ステータス', '処理済み', 'いいね数'
      ]);
    });
  }
  
  /**
   * シート取得または作成
   */
  getOrCreateSheet(sheetName, headers) {
    let sheet = this.spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      // ヘッダー行のフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#6366f1');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      
      // 列幅の自動調整
      for (let i = 1; i <= headers.length; i++) {
        sheet.autoResizeColumn(i);
      }
    }
    
    return sheet;
  }
  
  /**
   * 質問追加
   */
  addQuestion(question) {
    // メインシートに追加
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
    
    // 地域別シートにも追加
    const regionName = this.getRegionName(question.region);
    const regionSheet = this.spreadsheet.getSheetByName(`質問_${regionName}`);
    if (regionSheet) {
      const regionRow = [
        question.id,
        question.category,
        question.content,
        question.author,
        question.timestamp,
        question.status,
        question.processed,
        question.likes
      ];
      regionSheet.appendRow(regionRow);
    }
  }
  
  /**
   * 質問取得
   */
  getQuestions(region = 'all') {
    const data = this.questionSheet.getDataRange().getValues();
    if (data.length <= 1) return []; // ヘッダーのみの場合
    
    const headers = data[0];
    const questions = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // IDが空の行はスキップ
      
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
   * 代表質問取得
   */
  getRepresentativeQuestions(region = 'all') {
    const data = this.representativeSheet.getDataRange().getValues();
    if (data.length <= 1) return []; // ヘッダーのみの場合
    
    const headers = data[0];
    const representatives = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue; // IDが空の行はスキップ
      
      const rep = {};
      headers.forEach((header, index) => {
        if (header === '元質問ID') {
          rep['sourceIds'] = row[index] ? row[index].split(',') : [];
        } else {
          rep[this.toCamelCase(header)] = row[index];
        }
      });
      
      if (region === 'all' || rep.region === region) {
        representatives.push(rep);
      }
    }
    
    return representatives;
  }
  
  /**
   * 代表質問保存
   */
  saveRepresentativeQuestions(representatives) {
    const rows = representatives.map(rep => [
      Utilities.getUuid(),
      rep.region,
      rep.question,
      rep.category,
      rep.clusterSize,
      rep.sourceIds.join(','),
      new Date().toISOString(),
      'Gemini API'
    ]);
    
    if (rows.length > 0) {
      const startRow = this.representativeSheet.getLastRow() + 1;
      this.representativeSheet.getRange(
        startRow,
        1,
        rows.length,
        rows[0].length
      ).setValues(rows);
    }
  }
  
  /**
   * 質問の処理済みフラグ更新
   */
  updateProcessedFlags(questionIds) {
    const data = this.questionSheet.getDataRange().getValues();
    const updates = [];
    
    for (let i = 1; i < data.length; i++) {
      if (questionIds.includes(data[i][0])) {
        updates.push([i + 1, 8, true]); // 行番号、処理済み列、値
      }
    }
    
    // バッチ更新
    updates.forEach(update => {
      this.questionSheet.getRange(update[0], update[1]).setValue(update[2]);
    });
  }
  
  /**
   * 元質問の取得
   */
  getQuestionsByIds(ids) {
    const allQuestions = this.getQuestions('all');
    return allQuestions.filter(q => ids.includes(q.id));
  }
  
  /**
   * 地域コードから地域名取得
   */
  getRegionName(regionCode) {
    const regionMap = {
      'osaka': '大阪',
      'nagoya': '名古屋',
      'fukuoka': '福岡',
      'hiroshima': '広島',
      'tokyo': '東京'
    };
    return regionMap[regionCode] || regionCode;
  }
  
  /**
   * いいねを追加
   */
  addLike(questionId) {
    const data = this.questionSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === questionId) {  // IDで一致確認
        const currentLikes = data[i][8] || 0;  // いいね数列
        this.questionSheet.getRange(i + 1, 9).setValue(currentLikes + 1);
        
        // 地域別シートも更新
        const region = data[i][1];
        const regionName = this.getRegionName(region);
        const regionSheet = this.spreadsheet.getSheetByName(`質問_${regionName}`);
        
        if (regionSheet) {
          const regionData = regionSheet.getDataRange().getValues();
          for (let j = 1; j < regionData.length; j++) {
            if (regionData[j][0] === questionId) {
              regionSheet.getRange(j + 1, 8).setValue(currentLikes + 1);
              break;
            }
          }
        }
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * いいね数を取得
   */
  getLikeCount(questionId) {
    const data = this.questionSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === questionId) {
        return data[i][8] || 0;
      }
    }
    
    return 0;
  }
  
  /**
   * ヘッダー名をキャメルケースに変換
   */
  toCamelCase(str) {
    // 日本語の場合はそのまま小文字に
    if (/[ぁ-んァ-ヶｱ-ﾝﾞﾟ一-龠]/.test(str)) {
      const mapping = {
        'ID': 'id',
        '地域': 'region',
        'カテゴリ': 'category',
        '質問内容': 'content',
        '投稿者': 'author',
        'タイムスタンプ': 'timestamp',
        'ステータス': 'status',
        '処理済み': 'processed',
        'いいね数': 'likes'
      };
      return mapping[str] || str.toLowerCase();
    }
    
    // 英語の場合は通常のキャメルケース変換
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
      .replace(/^./, (match) => match.toLowerCase());
  }
}