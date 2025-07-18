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
    
    const prompt = `あなたは教育イベントの質問を分析する専門家です。
以下は${regionName}地域の「${categoryName}」カテゴリーに関する質問群です。

これらの質問に共通する本質的な疑問や関心事を理解し、
それを的確に表現する代表的な質問を1つ生成してください。

要件：
- 30文字以内で簡潔に
- 専門用語は避け、分かりやすい表現で
- 質問の核心を捉える
- 「〜ですか？」「〜でしょうか？」の形式で
- 具体的かつ実践的な内容に

質問群：
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

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