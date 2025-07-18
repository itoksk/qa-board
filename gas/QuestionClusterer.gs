/**
 * 質問クラスタリングクラス
 */
class QuestionClusterer {
  constructor() {
    this.sheetManager = new SheetManager();
    
    // GeminiServiceの初期化を試みる
    try {
      this.geminiService = new GeminiService();
    } catch (error) {
      console.error('GeminiService initialization failed:', error);
      this.geminiService = null;
    }
    
    this.vectorizer = new TextVectorizer();
    this.kmeans = new KMeansClusterer();
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
          console.log(`Processing cluster with ${cluster.length} questions in category: ${category}`);
          const representative = this.generateRepresentative(
            cluster,
            category,
            region
          );
          console.log('Generated representative:', representative);
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
   * 質問のクラスタリング（ML_ALGORITHM.mdに基づく実装）
   */
  clusterQuestions(questions) {
    if (questions.length <= 3) {
      // 質問が少ない場合は1つのクラスタに
      return [questions];
    }
    
    try {
      // 1. テキストのベクトル化
      const texts = questions.map(q => q.content);
      this.vectorizer.fit(texts);
      const vectors = this.vectorizer.transform(texts);
      
      // 2. 最適なクラスタ数を決定
      const optimalK = this.kmeans.findOptimalClusters(vectors, 2, Math.min(10, Math.floor(questions.length / 2)));
      console.log(`Optimal clusters: ${optimalK} for ${questions.length} questions`);
      
      // 3. K-Meansクラスタリング実行
      const { labels, centers } = this.kmeans.cluster(vectors, optimalK);
      
      // 4. クラスタごとに質問をグループ化
      const clusters = [];
      for (let i = 0; i < optimalK; i++) {
        const clusterQuestions = [];
        labels.forEach((label, idx) => {
          if (label === i) {
            clusterQuestions.push({
              ...questions[idx],
              vector: vectors[idx],
              distanceToCenter: this.kmeans.euclideanDistance(vectors[idx], centers[i])
            });
          }
        });
        
        if (clusterQuestions.length > 0) {
          // 中心点に近い順にソート
          clusterQuestions.sort((a, b) => a.distanceToCenter - b.distanceToCenter);
          clusters.push(clusterQuestions);
        }
      }
      
      console.log(`Created ${clusters.length} clusters`);
      return clusters;
      
    } catch (error) {
      console.error('Clustering error:', error);
      // フォールバック: 簡易的なグループ化
      const clusterSize = Math.ceil(questions.length / 3);
      const clusters = [];
      
      for (let i = 0; i < questions.length; i += clusterSize) {
        clusters.push(questions.slice(i, i + clusterSize));
      }
      
      return clusters;
    }
  }
  
  /**
   * 代表質問生成（ML_ALGORITHM.mdに基づく実装）
   */
  generateRepresentative(clusterQuestions, category, region) {
    const questionTexts = clusterQuestions.map(q => q.content);
    
    // 代表質問の選定方法
    let representativeQuestion;
    let method = 'centroid'; // デフォルトは重心最近傍法
    
    // Gemini APIの使用を試みる
    if (this.geminiService) {
      try {
        representativeQuestion = this.geminiService.generateSummary(
          questionTexts,
          category,
          region
        );
        method = 'gemini';
        console.log('Generated summary using Gemini:', representativeQuestion);
      } catch (error) {
        console.error('Gemini API error:', error);
        representativeQuestion = null;
      }
    }
    
    // Geminiが使えない場合のフォールバック処理
    if (!representativeQuestion) {
      // フォールバック1: 重心最近傍法
      // クラスタリング時に既に中心点に近い順でソートされているため、最初の質問を使用
      if (clusterQuestions.length > 0 && clusterQuestions[0].content) {
        representativeQuestion = clusterQuestions[0].content;
        console.log('Using centroid method:', representativeQuestion);
      } else {
        // フォールバック2: 簡易的な要約生成
        representativeQuestion = this.generateFallbackSummary(clusterQuestions, category);
        method = 'fallback';
        console.log('Using fallback method:', representativeQuestion);
      }
    }
    
    // 重要度スコアの計算
    const importanceScore = this.calculateImportanceScore(clusterQuestions);
    
    return {
      region: region,
      category: category,
      question: representativeQuestion,
      clusterSize: clusterQuestions.length,
      sourceIds: clusterQuestions.map(q => q.id),
      sourceQuestions: questionTexts,
      method: method,
      importanceScore: importanceScore
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
    console.log(`Generating fallback summary for ${questions.length} questions in category: ${category}`);
    
    // カテゴリ別のキーワードを抽出
    const keywords = this.extractKeywords(questions);
    const categoryName = this.getCategoryName(category);
    
    // 質問の共通パターンを分析
    const patterns = this.analyzeQuestionPatterns(questions);
    
    // 共通テーマを抽出
    const commonThemes = this.extractCommonThemes(questions);
    
    let summary;
    
    // より具体的な要約を生成
    if (commonThemes.tool && commonThemes.usage) {
      // 特定のツールの使い方について
      summary = `${commonThemes.tool}を${commonThemes.usage}するための方法は？`;
    } else if (patterns.howTo > patterns.what && keywords.length > 0) {
      // 「どのように」系で具体的なキーワードがある場合
      const mainKeyword = this.selectMainKeyword(keywords, questions);
      summary = `${categoryName}で${mainKeyword}を活用する効果的な方法は？`;
    } else if (patterns.what > patterns.howTo && keywords.length > 0) {
      // 「何ですか」系で具体的なキーワードがある場合
      const mainKeyword = this.selectMainKeyword(keywords, questions);
      summary = `${categoryName}における${mainKeyword}の基本について教えてください`;
    } else if (patterns.caution > 0 || patterns.ethics > 0) {
      // 注意点や倫理に関する質問が多い場合
      summary = `${categoryName}を使用する際の注意点や倫理的配慮は？`;
    } else if (keywords.length >= 2) {
      // 複数のキーワードから要約
      summary = `${categoryName}で${keywords[0]}や${keywords[1]}を活用する方法は？`;
    } else {
      // デフォルトだが、カテゴリに応じて少し具体化
      const defaultQuestions = {
        'ai': '生成AIを教育現場で効果的に活用する方法は？',
        'education': '新しい教育手法を授業に取り入れる方法は？',
        'ict': 'ICTツールを授業で効果的に使う方法は？',
        'other': '教育現場での新しい取り組みについて教えてください'
      };
      summary = defaultQuestions[category] || `${categoryName}の活用について教えてください`;
    }
    
    // 30文字制限
    if (summary.length > 30) {
      summary = summary.substring(0, 27) + '...？';
    }
    
    console.log(`Generated fallback summary: ${summary}`);
    return summary;
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
      when: 0,     // 「いつ」「タイミング」
      caution: 0,  // 「注意」「気をつける」
      ethics: 0    // 「倫理」「モラル」
    };
    
    questions.forEach(q => {
      const content = q.content;
      if (content.includes('方法') || content.includes('どのように') || content.includes('どうやって') || content.includes('どう')) {
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
      if (content.includes('注意') || content.includes('気をつける') || content.includes('留意')) {
        patterns.caution++;
      }
      if (content.includes('倫理') || content.includes('モラル') || content.includes('倫理的')) {
        patterns.ethics++;
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
  
  /**
   * 重要度スコアの計算（ML_ALGORITHM.mdに基づく）
   */
  calculateImportanceScore(clusterQuestions) {
    let score = 0;
    
    // クラスタサイズ（頻度）
    score += clusterQuestions.length * 10;
    
    // いいね数
    const totalLikes = clusterQuestions.reduce((sum, q) => sum + (q.likes || 0), 0);
    score += totalLikes;
    
    // 処理済みフラグ（緊急度の代替）
    const processedCount = clusterQuestions.filter(q => !q.processed).length;
    score += processedCount * 5;
    
    return score;
  }
  
  /**
   * 共通テーマの抽出
   */
  extractCommonThemes(questions) {
    const themes = {
      tool: null,
      usage: null
    };
    
    // ツール名の検出
    const tools = ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'AI', 'ICT', 'タブレット', 'PC', 'パソコン'];
    const toolCounts = {};
    
    questions.forEach(q => {
      tools.forEach(tool => {
        if (q.content.includes(tool)) {
          toolCounts[tool] = (toolCounts[tool] || 0) + 1;
        }
      });
    });
    
    // 最も頻出するツールを選択
    let maxCount = 0;
    Object.entries(toolCounts).forEach(([tool, count]) => {
      if (count > maxCount && count >= questions.length / 2) {
        maxCount = count;
        themes.tool = tool;
      }
    });
    
    // 使用方法の検出
    const usagePatterns = [
      { pattern: '授業', usage: '授業で活用' },
      { pattern: '教材', usage: '教材作成に活用' },
      { pattern: '評価', usage: '評価に活用' },
      { pattern: '生徒', usage: '生徒指導で活用' },
      { pattern: '保護者', usage: '保護者対応で活用' }
    ];
    
    const usageCounts = {};
    questions.forEach(q => {
      usagePatterns.forEach(({ pattern, usage }) => {
        if (q.content.includes(pattern)) {
          usageCounts[usage] = (usageCounts[usage] || 0) + 1;
        }
      });
    });
    
    // 最も頻出する使用方法を選択
    maxCount = 0;
    Object.entries(usageCounts).forEach(([usage, count]) => {
      if (count > maxCount) {
        maxCount = count;
        themes.usage = usage;
      }
    });
    
    return themes;
  }
  
  /**
   * メインキーワードの選択
   */
  selectMainKeyword(keywords, questions) {
    // キーワードの重要度を計算
    const keywordScores = {};
    
    keywords.forEach(keyword => {
      let score = 0;
      questions.forEach(q => {
        if (q.content.includes(keyword)) {
          // タイトルに近い位置にあるほど高スコア
          const position = q.content.indexOf(keyword);
          score += (100 - position) / 100;
          
          // 複数回出現する場合は追加スコア
          const count = (q.content.match(new RegExp(keyword, 'g')) || []).length;
          score += count * 0.5;
        }
      });
      keywordScores[keyword] = score;
    });
    
    // 最高スコアのキーワードを返す
    let maxScore = 0;
    let mainKeyword = keywords[0] || '';
    
    Object.entries(keywordScores).forEach(([keyword, score]) => {
      if (score > maxScore) {
        maxScore = score;
        mainKeyword = keyword;
      }
    });
    
    return mainKeyword;
  }
}