/**
 * キュー管理クラス
 * 高負荷時の意見投稿を順次処理するための仕組み
 */
class QueueManager {
  constructor() {
    this.spreadsheet = SpreadsheetApp.openById(getSpreadsheetId());
    this.initQueueSheet();
  }
  
  /**
   * キューシートの初期化
   */
  initQueueSheet() {
    this.queueSheet = this.getOrCreateSheet('意見キュー', [
      'ID', 'タイムスタンプ', 'データ', 'ステータス', '試行回数', 'エラーメッセージ'
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
      
      // ヘッダー行のフォーマット
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4CAF50');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  }
  
  /**
   * キューに意見を追加
   */
  addToQueue(questionData) {
    const queueItem = {
      id: Utilities.getUuid(),
      timestamp: new Date().toISOString(),
      data: JSON.stringify(questionData),
      status: 'pending',
      retryCount: 0,
      errorMessage: ''
    };
    
    this.queueSheet.appendRow([
      queueItem.id,
      queueItem.timestamp,
      queueItem.data,
      queueItem.status,
      queueItem.retryCount,
      queueItem.errorMessage
    ]);
    
    return queueItem.id;
  }
  
  /**
   * 未処理のキューアイテムを取得
   */
  getPendingItems(limit = 10) {
    const data = this.queueSheet.getDataRange().getValues();
    const headers = data[0];
    const items = [];
    
    for (let i = 1; i < data.length && items.length < limit; i++) {
      const row = data[i];
      const item = this.rowToObject(row, headers);
      
      if (item.status === 'pending' && item.retryCount < 3) {
        items.push({
          ...item,
          rowIndex: i + 1
        });
      }
    }
    
    return items;
  }
  
  /**
   * キューアイテムのステータス更新
   */
  updateStatus(rowIndex, status, errorMessage = '') {
    this.queueSheet.getRange(rowIndex, 4).setValue(status);
    if (errorMessage) {
      this.queueSheet.getRange(rowIndex, 6).setValue(errorMessage);
    }
  }
  
  /**
   * リトライ回数を増加
   */
  incrementRetryCount(rowIndex) {
    const currentCount = this.queueSheet.getRange(rowIndex, 5).getValue();
    this.queueSheet.getRange(rowIndex, 5).setValue(currentCount + 1);
  }
  
  /**
   * 行データをオブジェクトに変換
   */
  rowToObject(row, headers) {
    const obj = {};
    headers.forEach((header, index) => {
      const key = this.headerToKey(header);
      obj[key] = row[index];
    });
    return obj;
  }
  
  /**
   * ヘッダー名をキー名に変換
   */
  headerToKey(header) {
    const mapping = {
      'ID': 'id',
      'タイムスタンプ': 'timestamp',
      'データ': 'data',
      'ステータス': 'status',
      '試行回数': 'retryCount',
      'エラーメッセージ': 'errorMessage'
    };
    return mapping[header] || header;
  }
  
  /**
   * 古い処理済みアイテムを削除（24時間以上前）
   */
  cleanupOldItems() {
    const data = this.queueSheet.getDataRange().getValues();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const rowsToDelete = [];
    
    for (let i = data.length - 1; i > 0; i--) {
      const timestamp = new Date(data[i][1]);
      const status = data[i][3];
      
      if (status === 'completed' && timestamp < oneDayAgo) {
        rowsToDelete.push(i + 1);
      }
    }
    
    // 下から削除
    rowsToDelete.forEach(rowIndex => {
      this.queueSheet.deleteRow(rowIndex);
    });
    
    return rowsToDelete.length;
  }
}