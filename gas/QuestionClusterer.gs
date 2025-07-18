/**
 * 質問クラスタリングクラス
 */
class QuestionClusterer {
  constructor() {
    this.geminiService = new GeminiService();
    this.sheetManager = new SheetManager();
  }
  
  /**
   * 質問処理メイン
   */
  processQuestions(region, forceRegenerate) {
    console.log(`Processing questions for region: ${region}, force: ${forceRegenerate}`);
    
    // 質問取得
    let questions = this.sheetManager.getQuestions(region);
    
    // 未処理のみフィルタ（強制再生成でない場合）
    if (!forceRegenerate) {
      questions = questions.filter(q => !q.processed);
    }
    
    if (questions.length === 0) {
      return { 
        message: '処理対象の質問がありません',
        processedCount: 0,
        representativeCount: 0
      };
    }
    
    // カテゴリ別にグループ化
    const categoryGroups = this.groupByCategory(questions);
    
    // 各カテゴリ内でクラスタリング
    const allRepresentatives = [];
    
    for (const [category, categoryQuestions] of Object.entries(categoryGroups)) {
      if (categoryQuestions.length === 0) continue;
      
      // 簡易的な類似度ベースのグループ化
      const clusters = this.clusterQuestions(categoryQuestions);
      
      // 各クラスタから代表質問生成
      for (const cluster of clusters) {
        if (cluster.length > 0) {
          const representative = this.generateRepresentative(
            cluster,
            category,
            region
          );
          allRepresentatives.push(representative);
        }
      }
    }
    
    // 結果を保存
    if (allRepresentatives.length > 0) {
      this.sheetManager.saveRepresentativeQuestions(allRepresentatives);
      
      // 処理済みフラグ更新
      const processedIds = questions.map(q => q.id);
      this.sheetManager.updateProcessedFlags(processedIds);
    }
    
    return {
      message: '代表質問の生成が完了しました',
      processedCount: questions.length,
      representativeCount: allRepresentatives.length,
      representatives: allRepresentatives
    };
  }
  
  /**
   * カテゴリ別グループ化
   */
  groupByCategory(questions) {
    const groups = {};
    
    questions.forEach(q => {
      if (!groups[q.category]) {
        groups[q.category] = [];
      }
      groups[q.category].push(q);
    });
    
    return groups;
  }
  
  /**
   * 質問のクラスタリング（簡易版）
   */
  clusterQuestions(questions) {
    // 質問数に応じてクラスタ数を決定
    const clusterCount = Math.min(Math.ceil(questions.length / 5), 5);
    
    if (questions.length <= 3) {
      // 質問が少ない場合は1つのクラスタに
      return [questions];
    }
    
    // 簡易的な長さベースのクラスタリング
    // 実際の実装では、ここでより高度な類似度計算を行う
    const sorted = [...questions].sort((a, b) => 
      a.content.length - b.content.length
    );
    
    const clusters = [];
    const itemsPerCluster = Math.ceil(questions.length / clusterCount);
    
    for (let i = 0; i < clusterCount; i++) {
      const start = i * itemsPerCluster;
      const end = Math.min(start + itemsPerCluster, questions.length);
      const cluster = sorted.slice(start, end);
      if (cluster.length > 0) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
  
  /**
   * 代表質問生成
   */
  generateRepresentative(clusterQuestions, category, region) {
    const questionTexts = clusterQuestions.map(q => q.content);
    
    // Gemini APIで要約
    let summary;
    try {
      summary = this.geminiService.generateSummary(
        questionTexts,
        category,
        region
      );
    } catch (error) {
      console.error('Gemini API error:', error);
      // フォールバック：最も長い質問を代表に
      const longest = clusterQuestions.reduce((prev, current) => 
        current.content.length > prev.content.length ? current : prev
      );
      summary = longest.content;
    }
    
    return {
      region: region,
      category: category,
      question: summary,
      clusterSize: clusterQuestions.length,
      sourceIds: clusterQuestions.map(q => q.id),
      sourceQuestions: questionTexts // デバッグ用
    };
  }
  
  /**
   * テキストの類似度計算（簡易版）
   */
  calculateSimilarity(text1, text2) {
    // 共通単語の割合で簡易的に計算
    const words1 = this.tokenize(text1);
    const words2 = this.tokenize(text2);
    
    const intersection = words1.filter(w => words2.includes(w));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }
  
  /**
   * 簡易トークナイザー
   */
  tokenize(text) {
    // 日本語の単語分割（簡易版）
    return text
      .replace(/[、。！？\s]+/g, ' ')
      .split(' ')
      .filter(w => w.length > 1);
  }
}