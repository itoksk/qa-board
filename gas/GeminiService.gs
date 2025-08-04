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
   * 意見要約生成
   */
  generateSummary(questions, category, region) {
    const regionName = this.getRegionDisplayName(region);
    const categoryName = this.getCategoryDisplayName(category);
    
    const prompt = `あなたは教育現場での意見を分析し、統合する専門家です。
以下は${questions.length}件の意見です。これらの意見の内容をよく分析し、参加者が共有したい経験や考えの本質を理解してください。

【意見群】
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

【分析タスク】
1. 各意見の核心となる経験や考えを抽出してください
2. 共通するキーワードやテーマを特定してください
3. すべての意見の本質を網羅した、簡潔で的確な代表意見を作成してください

【代表意見の要件】
- 参加者の経験や考えを統合した意見文にする
- 100-200文字程度で、内容を充実させてまとめる
- すべての意見の核心的な内容を含める
- 具体的なツール名（NotebookLM、Gem等）や手法名は必ず残す
- 複数の観点がある場合は3-5点程度まで含めて統合
- 実践的で具体的な内容を詳しく述べる
- カテゴリの趣旨に沿った内容にする
- 参加者が共有したい経験や工夫点を具体的に含める
- 必ず句点「。」で終わる完全な意見文にする

【重要】
- 意見の本質を捉えることを最優先にしてください
- 地域名は含めなくて構いません
- 参加者が実際に共有したい経験や考えを正確に反映してください
- 疑問文ではなく、提案・経験・考えを述べる文章にしてください

代表意見（句点で終わる完全な意見文で回答）：`;

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
            maxOutputTokens: 800,
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
      
      // デバッグ情報
      console.log('Gemini response length:', generatedText.length);
      console.log('Gemini response:', generatedText);
      
      // 空レスポンスのチェック
      if (!generatedText || generatedText.length === 0) {
        console.error('Gemini returned empty response');
        console.error('Full API response:', JSON.stringify(result));
        throw new Error('Gemini APIから空のレスポンスが返されました');
      }
      
      // レスポンスが極端に短い場合（30文字未満）はエラーとする
      if (generatedText.length < 30) {
        console.error('Gemini response too short:', generatedText);
        console.error('Full API response:', JSON.stringify(result));
        throw new Error('Gemini APIのレスポンスが短すぎます: ' + generatedText);
      }
      
      // finishReasonを確認（途中で切れたかどうか）
      const finishReason = result.candidates[0].finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn('Gemini response was truncated. Reason:', finishReason);
      }
      
      // 意見として完結しているか確認（句読点で終わっているか）
      // 意見なので「？」は不要、句点「。」で終わるべき
      if (!generatedText.endsWith('。') && !generatedText.endsWith('.')) {
        console.warn('Generated opinion seems incomplete:', generatedText);
        // 不完全な場合は「。」を追加
        return generatedText + '。';
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
   * 複数の意見から詳細な分析を生成
   */
  generateDetailedAnalysis(questions, category, region) {
    const prompt = `以下の意見群を分析し、教育現場での関心事を抽出してください。

地域：${this.getRegionDisplayName(region)}
カテゴリ：${this.getCategoryDisplayName(category)}

意見群：
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
      'notebooklm': 'NotebookLMが活躍しような場面',
      'gem': 'Gemを使ってみた感想や期待感',
      'future': '生成AIを手にした私たちは、子どもたちのためにどんな新しい教育をデザインできるでしょうか？'
    };
    return categoryMap[category] || category;
  }
}