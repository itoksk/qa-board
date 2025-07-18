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
以下は${questions.length}件の質問です。これらの質問の内容をよく分析し、質問者が本当に知りたがっていることを理解してください。

【質問群】
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

【分析タスク】
1. 各質問の具体的な意図と背後にある懸念を理解してください
2. 質問間の共通点と相違点を見つけてください
3. すべての質問者の関心事を統合した代表質問を作成してください

【代表質問の要件】
- 文字数制限なし（内容の充実を最優先）
- 具体的なツール名（ChatGPT、Gemini等）や手法名は残す
- 複数の観点を含む場合は「〜と〜の比較」「〜における〜と〜」のように統合
- 実践的で具体的な内容にする
- 自然な日本語の質問形式で終わる
- カテゴリ名にとらわれず、実際の質問内容に基づいて生成する

【重要】
- 質問の本質を捉えることを最優先にしてください
- 地域名やカテゴリ名を無理に含める必要はありません
- 質問者が実際に聞きたいことを正確に反映してください

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
            maxOutputTokens: 200,
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
      
      // 文字数制限を撤廃し、完全な質問を返す
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