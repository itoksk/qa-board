// QA Board - メインコード
// グローバル設定
const SPREADSHEET_ID = '1Fr8mA0Kfcz_emCpFH1V7yDiytyxiuLTEcPWD0ifn_q0';
const ADMIN_PASSWORD = 'ictedu';

/**
 * Webアプリのエントリーポイント（GET）
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index_gas');
  template.data = {
    spreadsheetId: SPREADSHEET_ID,
    regions: ['osaka', 'nagoya', 'fukuoka', 'hiroshima', 'tokyo'],
    categories: ['ai', 'education', 'ict', 'other']
  };
  
  return template.evaluate()
    .setTitle('QA Board - 教育イベント質問集約システム')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
      case 'getGeneratedQuestions':
        return handleGetGeneratedQuestions(data);
      case 'generateRepresentative':
        return handleGenerateRepresentative(data);
      case 'verifyPassword':
        return handleVerifyPassword(data);
      default:
        throw new Error('Unknown action: ' + action);
    }
  } catch(error) {
    console.error('doPost error:', error);
    return createJsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * HTMLファイルのインクルード
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * JSONレスポンス生成
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// サーバーサイド関数（クライアントから呼び出し可能）

/**
 * いいねを追加
 */
function addLike(questionId) {
  try {
    const sheetManager = new SheetManager();
    const success = sheetManager.addLike(questionId);
    
    if (success) {
      return {
        success: true,
        newLikeCount: sheetManager.getLikeCount(questionId)
      };
    } else {
      return {
        success: false,
        error: '質問が見つかりません'
      };
    }
  } catch (error) {
    console.error('addLike error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 質問を投稿
 */
function submitQuestion(data) {
  try {
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
    
    return {
      success: true,
      questionId: question.id
    };
  } catch (error) {
    console.error('submitQuestion error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 質問一覧を取得
 */
function getQuestions(region = 'all') {
  try {
    const sheetManager = new SheetManager();
    const questions = sheetManager.getQuestions(region);
    
    // 最新順にソート
    questions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return {
      success: true,
      questions: questions
    };
  } catch (error) {
    console.error('getQuestions error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 生成された代表質問を取得
 */
function getGeneratedQuestions(region = 'all') {
  try {
    const sheetManager = new SheetManager();
    const representatives = sheetManager.getRepresentativeQuestions(region);
    
    // 各代表質問にソース質問の内容を追加
    representatives.forEach(rep => {
      if (rep.sourceIds && rep.sourceIds.length > 0) {
        const sourceQuestions = sheetManager.getQuestionsByIds(rep.sourceIds);
        rep.sourceQuestions = sourceQuestions.map(q => q.content || '');
      } else {
        rep.sourceQuestions = [];
      }
    });
    
    // 最新順にソート
    representatives.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    
    return {
      success: true,
      representatives: representatives
    };
  } catch (error) {
    console.error('getGeneratedQuestions error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 代表質問を生成（管理者のみ）
 */
function generateRepresentative(region, password, forceRegenerate = false) {
  try {
    // パスワード検証
    if (password !== ADMIN_PASSWORD) {
      return {
        success: false,
        error: 'パスワードが正しくありません'
      };
    }
    
    const clusterer = new QuestionClusterer();
    const results = clusterer.processQuestions(region, forceRegenerate);
    
    return {
      success: true,
      results: results
    };
  } catch (error) {
    console.error('generateRepresentative error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * パスワード検証
 */
function verifyPassword(password) {
  return {
    success: password === ADMIN_PASSWORD
  };
}

// ユーティリティ関数

/**
 * 地域名の表示用変換
 */
function getRegionDisplayName(region) {
  const regionMap = {
    'osaka': '大阪',
    'nagoya': '名古屋',
    'fukuoka': '福岡',
    'hiroshima': '広島',
    'tokyo': '東京',
    'all': '全地域'
  };
  return regionMap[region] || region;
}

/**
 * カテゴリ名の表示用変換
 */
function getCategoryDisplayName(category) {
  const categoryMap = {
    'ai': '生成AI',
    'education': '教育',
    'ict': 'ICT',
    'other': 'その他'
  };
  return categoryMap[category] || category;
}