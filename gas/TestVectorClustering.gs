/**
 * ベクトル化とクラスタリングの動作確認
 */
function testVectorClusteringDetailed() {
  console.log('=== ベクトル化・クラスタリング詳細テスト ===');
  
  try {
    const clusterer = new QuestionClusterer();
    
    // テスト用の類似質問群
    const testQuestions = [
      {
        id: 'test1',
        content: 'ChatGPTを授業で活用する方法を教えてください',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test2',
        content: 'ChatGPTを教育現場で使う際の注意点は何ですか？',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test3',
        content: '生成AIを授業に導入する際のガイドラインは？',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test4',
        content: 'プログラミング教育を始めるには？',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test5',
        content: 'オンライン授業の効果的な進め方',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      }
    ];
    
    console.log('テスト質問数:', testQuestions.length);
    testQuestions.forEach((q, i) => {
      console.log(`${i + 1}. ${q.content}`);
    });
    
    // ベクトル化のテスト
    console.log('\n=== ベクトル化テスト ===');
    const vectorizer = new TextVectorizer();
    const texts = testQuestions.map(q => q.content);
    
    console.log('前処理テスト:');
    texts.forEach((text, i) => {
      const preprocessed = vectorizer.preprocessText(text);
      console.log(`${i + 1}. 元: "${text}"`);
      console.log(`   処理後: "${preprocessed}"`);
    });
    
    // ベクトル化実行
    console.log('\nベクトル化実行中...');
    vectorizer.fit(texts);
    const vectors = vectorizer.transform(texts);
    
    console.log('語彙サイズ:', Object.keys(vectorizer.vocabulary).length);
    console.log('ベクトル次元数:', vectors[0].length);
    console.log('最初の10語彙:', Object.keys(vectorizer.vocabulary).slice(0, 10));
    
    // 類似度マトリックスを計算
    console.log('\n=== 類似度マトリックス ===');
    console.log('   ', texts.map((_, i) => `Q${i + 1}`).join('    '));
    for (let i = 0; i < vectors.length; i++) {
      const similarities = [];
      for (let j = 0; j < vectors.length; j++) {
        const sim = vectorizer.cosineSimilarity(vectors[i], vectors[j]);
        similarities.push(sim.toFixed(2));
      }
      console.log(`Q${i + 1}: [${similarities.join(', ')}]`);
    }
    
    // K-meansクラスタリングのテスト
    console.log('\n=== K-meansクラスタリング ===');
    const kmeans = new KMeansClusterer();
    
    // 最適クラスタ数の決定
    console.log('最適クラスタ数を探索中...');
    const optimalK = kmeans.findOptimalClusters(vectors, 2, 4);
    console.log('最適クラスタ数:', optimalK);
    
    // クラスタリング実行
    const { labels, centers, inertia } = kmeans.cluster(vectors, optimalK);
    console.log('クラスタリング結果:');
    console.log('ラベル:', labels);
    console.log('慣性:', inertia.toFixed(3));
    
    // クラスタごとに質問を表示
    console.log('\nクラスタ別の質問:');
    for (let k = 0; k < optimalK; k++) {
      console.log(`\nクラスタ ${k}:`);
      labels.forEach((label, i) => {
        if (label === k) {
          const distance = kmeans.euclideanDistance(vectors[i], centers[k]);
          console.log(`  - ${texts[i]}`);
          console.log(`    (中心からの距離: ${distance.toFixed(3)})`);
        }
      });
    }
    
    // QuestionClustererのclusterQuestions関数をテスト
    console.log('\n\n=== QuestionClusterer.clusterQuestions テスト ===');
    const clusters = clusterer.clusterQuestions(testQuestions);
    console.log('生成されたクラスタ数:', clusters.length);
    
    clusters.forEach((cluster, i) => {
      console.log(`\nクラスタ ${i + 1} (${cluster.length}件):`);
      cluster.forEach(q => {
        console.log(`  - ${q.content}`);
        if (q.distanceToCenter !== undefined) {
          console.log(`    距離: ${q.distanceToCenter.toFixed(3)}`);
        }
      });
    });
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * 実際のデータでベクトル分析をテスト
 */
function testVectorAnalysisWithRealData() {
  console.log('=== 実データでのベクトル分析テスト ===');
  
  try {
    const sheetManager = new SheetManager();
    const clusterer = new QuestionClusterer();
    
    // 大阪のAIカテゴリの質問を取得
    const allQuestions = sheetManager.getQuestions('osaka');
    const aiQuestions = allQuestions.filter(q => q.category === 'ai');
    
    console.log(`大阪のAI質問数: ${aiQuestions.length}`);
    
    if (aiQuestions.length >= 2) {
      console.log('\n質問内容:');
      aiQuestions.forEach((q, i) => {
        console.log(`${i + 1}. ${q.content}`);
      });
      
      // クラスタリング実行
      console.log('\nクラスタリング実行中...');
      const clusters = clusterer.clusterQuestions(aiQuestions);
      
      console.log(`生成されたクラスタ数: ${clusters.length}`);
      
      // 代表質問生成テスト
      if (clusters.length > 0 && clusters[0].length > 1) {
        console.log('\n最初のクラスタで代表質問生成:');
        const rep = clusterer.generateRepresentative(clusters[0], 'ai', 'osaka');
        console.log('代表質問:', rep.question);
        console.log('生成方法:', rep.method);
        console.log('元の質問数:', rep.clusterSize);
      }
    } else {
      console.log('AI質問が2件未満のため、クラスタリングできません');
      console.log('addSimilarTestQuestions()を実行してテストデータを追加してください');
    }
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}