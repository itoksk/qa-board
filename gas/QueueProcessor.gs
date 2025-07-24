/**
 * キュー処理関数
 * 定期的にトリガーから呼び出される
 */
function processQueue() {
  console.log('キュー処理開始:', new Date().toISOString());
  
  try {
    const queueManager = new QueueManager();
    const sheetManager = new SheetManager();
    
    // 未処理のアイテムを取得（最大10件ずつ処理）
    const pendingItems = queueManager.getPendingItems(10);
    
    if (pendingItems.length === 0) {
      console.log('処理待ちのアイテムはありません');
      return;
    }
    
    console.log(`${pendingItems.length}件のアイテムを処理します`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 各アイテムを処理
    for (const item of pendingItems) {
      try {
        // ステータスを処理中に更新
        queueManager.updateStatus(item.rowIndex, 'processing');
        
        // JSONデータをパース
        const questionData = JSON.parse(item.data);
        
        // 実際に意見を投稿
        submitQuestionDirect(questionData);
        
        // ステータスを完了に更新
        queueManager.updateStatus(item.rowIndex, 'completed');
        successCount++;
        
        // 少し待機（スプレッドシートへの負荷軽減）
        Utilities.sleep(100);
        
      } catch (error) {
        console.error(`アイテム ${item.id} の処理エラー:`, error);
        errorCount++;
        
        // リトライ回数を増加
        queueManager.incrementRetryCount(item.rowIndex);
        
        // エラーステータスに更新
        queueManager.updateStatus(item.rowIndex, 'error', error.toString());
        
        // 3回失敗したら諦める
        if (item.retryCount >= 2) {
          queueManager.updateStatus(item.rowIndex, 'failed', 
            `最大リトライ回数に達しました: ${error.toString()}`);
        } else {
          // リトライのため、ステータスをpendingに戻す
          queueManager.updateStatus(item.rowIndex, 'pending', error.toString());
        }
      }
    }
    
    console.log(`処理完了 - 成功: ${successCount}, エラー: ${errorCount}`);
    
    // 古い完了済みアイテムをクリーンアップ
    const cleanedCount = queueManager.cleanupOldItems();
    if (cleanedCount > 0) {
      console.log(`${cleanedCount}件の古いアイテムを削除しました`);
    }
    
  } catch (error) {
    console.error('キュー処理中の重大エラー:', error);
  }
}

/**
 * キュー処理トリガーの設定確認・作成
 */
function ensureQueueTrigger() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    const queueTrigger = triggers.find(trigger => 
      trigger.getHandlerFunction() === 'processQueue'
    );
    
    if (!queueTrigger) {
      // 1分ごとに実行するトリガーを作成
      ScriptApp.newTrigger('processQueue')
        .timeBased()
        .everyMinutes(1)
        .create();
      
      console.log('キュー処理トリガーを作成しました');
    }
  } catch (error) {
    console.error('トリガー設定エラー:', error);
  }
}

/**
 * キュー処理トリガーの削除
 */
function removeQueueTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processQueue') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  console.log('キュー処理トリガーを削除しました');
}

/**
 * キューの状態を確認
 */
function checkQueueStatus() {
  const queueManager = new QueueManager();
  const sheet = queueManager.queueSheet;
  const data = sheet.getDataRange().getValues();
  
  const statusCount = {
    pending: 0,
    processing: 0,
    completed: 0,
    error: 0,
    failed: 0
  };
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][3];
    if (statusCount.hasOwnProperty(status)) {
      statusCount[status]++;
    }
  }
  
  console.log('キューステータス:');
  console.log('- 待機中:', statusCount.pending);
  console.log('- 処理中:', statusCount.processing);
  console.log('- 完了:', statusCount.completed);
  console.log('- エラー:', statusCount.error);
  console.log('- 失敗:', statusCount.failed);
  console.log('- 合計:', data.length - 1);
  
  return statusCount;
}

/**
 * エラーになったアイテムをリトライ
 */
function retryErrorItems() {
  const queueManager = new QueueManager();
  const sheet = queueManager.queueSheet;
  const data = sheet.getDataRange().getValues();
  let retryCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][3];
    const retries = data[i][4];
    
    if (status === 'error' && retries < 3) {
      sheet.getRange(i + 1, 4).setValue('pending');
      retryCount++;
    }
  }
  
  console.log(`${retryCount}件のエラーアイテムをリトライキューに戻しました`);
  return retryCount;
}