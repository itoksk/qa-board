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
      // フォールバック：簡易的な要約生成
      summary = this.generateFallbackSummary(clusterQuestions, category);
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
  
  /**
   * フォールバック用の簡易要約生成
   */
  generateFallbackSummary(questions, category) {
    // カテゴリ別のキーワードを抽出
    const keywords = this.extractKeywords(questions);
    const categoryName = this.getCategoryName(category);
    
    // 質問の共通パターンを分析
    const patterns = this.analyzeQuestionPatterns(questions);
    
    // テンプレートベースで代表質問を生成
    if (patterns.howTo > patterns.what) {
      // 「どのように」系の質問が多い場合
      return `${categoryName}を効果的に活用する方法は？`;
    } else if (patterns.what > patterns.howTo) {
      // 「何ですか」系の質問が多い場合
      return `${categoryName}の基本的な使い方を教えてください`;
    } else if (keywords.length > 0) {
      // キーワードベース
      return `${categoryName}で${keywords[0]}をどう活用すればよいですか？`;
    } else {
      // デフォルトパターン
      return `${categoryName}の活用について教えてください`;
    }
  }
  
  /**
   * キーワード抽出
   */
  extractKeywords(questions) {
    const wordCounts = {};
    const stopWords = ['です', 'ます', 'する', 'なる', 'ある', 'いる', 'れる', 'られる', 'こと', 'もの', 'ため'];
    
    // 全質問からキーワードをカウント
    questions.forEach(q => {
      const words = this.tokenize(q.content);
      words.forEach(word => {
        // 3文字以上でストップワードでない単語のみカウント
        if (word.length >= 3 && !stopWords.includes(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });
    
    // 頻出順にソート
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }
  
  /**
   * 質問パターンの分析
   */
  analyzeQuestionPatterns(questions) {
    const patterns = {
      howTo: 0,    // 「どのように」「方法」
      what: 0,     // 「何ですか」「とは」
      why: 0,      // 「なぜ」「理由」
      when: 0      // 「いつ」「タイミング」
    };
    
    questions.forEach(q => {
      const content = q.content;
      if (content.includes('方法') || content.includes('どのように') || content.includes('どうやって')) {
        patterns.howTo++;
      }
      if (content.includes('何ですか') || content.includes('とは') || content.includes('について')) {
        patterns.what++;
      }
      if (content.includes('なぜ') || content.includes('理由')) {
        patterns.why++;
      }
      if (content.includes('いつ') || content.includes('タイミング')) {
        patterns.when++;
      }
    });
    
    return patterns;
  }
  
  /**
   * カテゴリ名の取得
   */
  getCategoryName(category) {
    const names = {
      'ai': '生成AI',
      'education': '教育',
      'ict': 'ICT',
      'other': 'その他'
    };
    return names[category] || category;
  }
}