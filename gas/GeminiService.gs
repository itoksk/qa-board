/**
 * Gemini API連携サービス
 */
class GeminiService {
  constructor() {
    // PropertiesServiceからAPIキー取得
    this.apiKey = PropertiesService.getScriptProperties()
      .getProperty('GEMINI_API_KEY');
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEYが設定されていません。スクリプトのプロパティで設定してください。');
    }
    
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  }
  
  /**
   * 質問要約生成
   */
  generateSummary(questions, category, region) {
    const regionName = this.getRegionDisplayName(region);
    const categoryName = this.getCategoryDisplayName(category);
    
    const prompt = `あなたは教育現場の質問を分析し、統合する専門家です。
以下は${regionName}地域の「${categoryName}」カテゴリーに関する${questions.length}件の質問です。

【質問群】
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

【分析タスク】
1. 各質問の具体的な意図を理解してください
2. 共通するテーマと個別の重要な視点を特定してください
3. すべての質問者の関心事を包含する代表質問を作成してください

【代表質問の要件】
- 35-45文字程度（内容の充実を優先）
- 具体的なツール名（ChatGPT、Gemini等）や手法名は残す
- 複数の視点を「〜しながら〜する方法」「〜における〜と〜」のように統合
- 実践的で具体的な内容（「効果的な活用」ではなく「授業での活用と注意点」など）
- 質問形式（〜ですか？／〜でしょうか？）

【例】
悪い例：「生成AIを教育現場でどう活用できますか？」（一般的すぎる）
良い例：「ChatGPTを授業で活用する際の具体的方法と注意点は？」（具体的）

代表質問：`;

    try {
      const response = UrlFetchApp.fetch(this.apiUrl + '?key=' + this.apiKey, {
        method: 'post',
        contentType: 'application/json',
        muteHttpExceptions: true,
        payload: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 100,
            candidateCount: 1
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE"
            }
          ]
        })
      });
      
      const responseCode = response.getResponseCode();
      if (responseCode !== 200) {
        console.error('Gemini API error:', response.getContentText());
        throw new Error(`API returned status ${responseCode}`);
      }
      
      const result = JSON.parse(response.getContentText());
      
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('No candidates returned from API');
      }
      
      const generatedText = result.candidates[0].content.parts[0].text.trim();
      
      // 30文字を超える場合は切り詰め
      if (generatedText.length > 30) {
        return generatedText.substring(0, 27) + '...？';
      }
      
      return generatedText;
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      console.error('Questions:', questions);
      
      // エラーを再スローして、呼び出し元でフォールバック処理を行う
      throw error;
    }
  }
  
  /**
   * 複数の質問から詳細な分析を生成
   */
  generateDetailedAnalysis(questions, category, region) {
    const prompt = `以下の質問群を分析し、教育現場での関心事を抽出してください。

地域：${this.getRegionDisplayName(region)}
カテゴリ：${this.getCategoryDisplayName(category)}

質問群：
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

以下の形式で分析してください：

【主要な関心事】
- 

【共通する課題】
- 

【推奨アクション】
- `;

    try {
      const response = UrlFetchApp.fetch(this.apiUrl + '?key=' + this.apiKey, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });
      
      const result = JSON.parse(response.getContentText());
      return result.candidates[0].content.parts[0].text.trim();
      
    } catch (error) {
      console.error('Detailed analysis error:', error);
      return null;
    }
  }
  
  /**
   * 地域名の表示用変換
   */
  getRegionDisplayName(region) {
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
  getCategoryDisplayName(category) {
    const categoryMap = {
      'ai': '生成AI',
      'education': '教育',
      'ict': 'ICT',
      'other': 'その他'
    };
    return categoryMap[category] || category;
  }
}