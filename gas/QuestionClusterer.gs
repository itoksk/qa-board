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
  processQuestions(region, forceRegenerate, crossCategory = true) {
    console.log(`Processing questions for region: ${region}, force: ${forceRegenerate}, crossCategory: ${crossCategory}`);
    
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
    
    const allRepresentatives = [];
    
    if (crossCategory) {
      // カテゴリをまたいでクラスタリング
      console.log('カテゴリをまたいでクラスタリングを実行');
      const clusters = this.clusterQuestions(questions);
      
      for (const cluster of clusters) {
        if (cluster.length > 0) {
          // クラスタ内の主要カテゴリを決定
          const categoryCount = {};
          cluster.forEach(q => {
            categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
          });
          const mainCategory = Object.entries(categoryCount)
            .sort((a, b) => b[1] - a[1])[0][0];
          
          console.log(`Processing cluster with ${cluster.length} questions (main category: ${mainCategory})`);
          const representative = this.generateRepresentative(
            cluster,
            mainCategory,
            region
          );
          console.log('Generated representative:', representative);
          allRepresentatives.push(representative);
        }
      }
    } else {
      // 従来のカテゴリ別処理
      const categoryGroups = this.groupByCategory(questions);
      
      for (const [category, categoryQuestions] of Object.entries(categoryGroups)) {
        if (categoryQuestions.length === 0) continue;
        
        const clusters = this.clusterQuestions(categoryQuestions);
        
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
      // フォールバック: 簡易的な要約生成を使用
      representativeQuestion = this.generateFallbackSummary(clusterQuestions, category);
      method = 'fallback';
      console.log('Using fallback method:', representativeQuestion);
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
    
    // 具体的な意図を抽出
    const intents = this.extractDetailedIntents(questions);
    const keywords = this.extractKeywords(questions);
    const patterns = this.analyzeQuestionPatterns(questions);
    const commonThemes = this.extractCommonThemes(questions);
    
    let summary;
    
    // より具体的で包括的な要約を生成
    if (intents.tools.length > 0 && intents.concerns.length > 0) {
      // ツールと懸念事項の両方がある場合
      const mainTool = intents.tools[0];
      const mainConcern = intents.concerns[0];
      summary = `${mainTool}を授業で使う際の${mainConcern}と活用方法は？`;
    } else if (intents.methods.length > 0 && intents.targets.length > 0) {
      // 手法と対象がある場合
      summary = `${intents.targets[0]}における${intents.methods[0]}の実践方法は？`;
    } else if (commonThemes.tool && commonThemes.usage) {
      // 特定のツールの使い方
      summary = `${commonThemes.tool}を${commonThemes.usage}する際の具体的方法と注意点は？`;
    } else if (patterns.howTo > 0 && patterns.caution > 0) {
      // 方法と注意点の両方が求められている
      const mainKeyword = this.selectMainKeyword(keywords, questions);
      summary = `${mainKeyword}の効果的な活用方法と留意点を教えてください`;
    } else if (keywords.length >= 3) {
      // 複数の具体的キーワードを統合
      summary = `${keywords[0]}や${keywords[1]}を使った${keywords[2]}の方法は？`;
    } else if (keywords.length >= 2) {
      // 2つのキーワードを組み合わせ
      summary = `${keywords[0]}における${keywords[1]}の実践的な取り組みは？`;
    } else {
      // カテゴリ別のより具体的なデフォルト
      const defaultQuestions = {
        'ai': 'ChatGPTやGeminiを授業で活用する際の方法と注意点は？',
        'education': 'アクティブラーニングや協働学習の効果的な実践方法は？',
        'ict': 'タブレットやデジタル教材を授業で活用する方法は？',
        'other': '教育現場での新しい取り組みと課題解決の方法は？'
      };
      summary = defaultQuestions[category] || this.createDefaultSummary(questions, category);
    }
    
    // 45文字以内に調整（内容を優先）
    if (summary.length > 45) {
      summary = summary.substring(0, 42) + '...？';
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
  
  /**
   * 詳細な意図抽出
   */
  extractDetailedIntents(questions) {
    const intents = {
      tools: [],      // 具体的なツール名
      methods: [],    // 手法・方法
      concerns: [],   // 懸念事項・注意点
      targets: [],    // 対象（生徒、授業、教材など）
      purposes: []    // 目的
    };
    
    // ツール名の抽出
    const toolPatterns = ['ChatGPT', 'Gemini', 'Claude', 'AI', '生成AI', 'タブレット', 'PC', 'ICT', 'デジタル教科書', 'オンライン'];
    const methodPatterns = ['活用', '導入', '実践', '評価', '指導', 'アクティブラーニング', '協働学習', 'プログラミング'];
    const concernPatterns = ['注意点', '留意点', '倫理', '著作権', 'ガイドライン', '課題', '問題点'];
    const targetPatterns = ['授業', '生徒', '教材', '教育現場', '小学生', '中学生', '高校生'];
    const purposePatterns = ['効果的', '円滑', '安全', '適切', '実践的'];
    
    questions.forEach(q => {
      const content = q.content;
      
      // 各パターンをチェック
      toolPatterns.forEach(tool => {
        if (content.includes(tool) && !intents.tools.includes(tool)) {
          intents.tools.push(tool);
        }
      });
      
      methodPatterns.forEach(method => {
        if (content.includes(method) && !intents.methods.includes(method)) {
          intents.methods.push(method);
        }
      });
      
      concernPatterns.forEach(concern => {
        if (content.includes(concern) && !intents.concerns.includes(concern)) {
          intents.concerns.push(concern);
        }
      });
      
      targetPatterns.forEach(target => {
        if (content.includes(target) && !intents.targets.includes(target)) {
          intents.targets.push(target);
        }
      });
      
      purposePatterns.forEach(purpose => {
        if (content.includes(purpose) && !intents.purposes.includes(purpose)) {
          intents.purposes.push(purpose);
        }
      });
    });
    
    // 頻度順にソート
    Object.keys(intents).forEach(key => {
      intents[key] = intents[key].slice(0, 3); // 上位3つまで
    });
    
    return intents;
  }
  
  /**
   * デフォルト要約の作成
   */
  createDefaultSummary(questions, category) {
    if (questions.length === 0) {
      return `${this.getCategoryName(category)}について教えてください`;
    }
    
    // 最初と最後の質問から要素を抽出してミックス
    const firstQ = questions[0].content;
    const lastQ = questions[questions.length - 1].content;
    
    // 最初の質問から主要な名詞を、最後の質問から動詞を抽出する簡易的な方法
    const keywords = this.extractKeywords(questions);
    if (keywords.length >= 2) {
      return `${keywords[0]}と${keywords[1]}の効果的な活用方法を教えてください`;
    }
    
    return `${this.getCategoryName(category)}の実践的な活用方法を教えてください`;
  }
}