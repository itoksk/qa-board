/**
 * クラスタリングのデバッグ関数
 */

/**
 * クラスタリング処理のテスト
 */
function testClustering() {
  console.log('=== クラスタリング処理テスト ===');
  
  try {
    const clusterer = new QuestionClusterer();
    const sheetManager = new SheetManager();
    
    // テスト用の質問を用意
    const testQuestions = [
      {
        id: 'test1',
        content: 'ChatGPTを授業で活用する方法を教えてください',
        category: 'ai',
        region: 'osaka',
        processed: false,
        likes: 0
      },
      {
        id: 'test2', 
        content: 'ChatGPTを教育現場で使う際の注意点は？',
        category: 'ai',
        region: 'osaka',
        processed: false,
        likes: 0
      },
      {
        id: 'test3',
        content: '生成AIを授業に取り入れる方法について',
        category: 'ai',
        region: 'osaka', 
        processed: false,
        likes: 0
      },
      {
        id: 'test4',
        content: 'プログラミング教育の始め方',
        category: 'education',
        region: 'osaka',
        processed: false,
        likes: 0
      },
      {
        id: 'test5',
        content: 'オンライン授業の効果的な進め方',
        category: 'ict',
        region: 'osaka',
        processed: false,
        likes: 0
      }
    ];
    
    console.log('\nテスト質問数:', testQuestions.length);
    
    // カテゴリ別にグループ化
    const categoryGroups = clusterer.groupByCategory(testQuestions);
    console.log('\nカテゴリ別グループ:');
    Object.entries(categoryGroups).forEach(([cat, questions]) => {
      console.log(`- ${cat}: ${questions.length}件`);
    });
    
    // AIカテゴリのクラスタリングをテスト
    const aiQuestions = categoryGroups['ai'] || [];
    if (aiQuestions.length > 0) {
      console.log('\n=== AIカテゴリのクラスタリング ===');
      console.log('質問数:', aiQuestions.length);
      
      const clusters = clusterer.clusterQuestions(aiQuestions);
      console.log('生成されたクラスタ数:', clusters.length);
      
      clusters.forEach((cluster, i) => {
        console.log(`\nクラスタ${i + 1} (${cluster.length}件):`);
        cluster.forEach(q => {
          console.log(`  - ${q.content}`);
          if (q.distanceToCenter !== undefined) {
            console.log(`    (中心からの距離: ${q.distanceToCenter.toFixed(3)})`);
          }
        });
      });
      
      // 代表質問の生成テスト
      if (clusters.length > 0 && clusters[0].length > 0) {
        console.log('\n=== 代表質問生成テスト ===');
        const rep = clusterer.generateRepresentative(clusters[0], 'ai', 'osaka');
        console.log('生成された代表質問:', rep.question);
        console.log('生成方法:', rep.method);
        console.log('クラスタサイズ:', rep.clusterSize);
        console.log('元質問ID:', rep.sourceIds);
      }
    }
    
    // 実際のデータでテスト
    console.log('\n\n=== 実データでのテスト ===');
    const realQuestions = sheetManager.getQuestions('osaka');
    console.log('大阪の質問数:', realQuestions.length);
    
    if (realQuestions.length > 0) {
      const realCategoryGroups = clusterer.groupByCategory(realQuestions);
      console.log('\nカテゴリ別:');
      Object.entries(realCategoryGroups).forEach(([cat, questions]) => {
        console.log(`- ${cat}: ${questions.length}件`);
        questions.forEach(q => {
          console.log(`    "${q.content.substring(0, 30)}..."`);
        });
      });
    }
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * ベクトル化のテスト
 */
function testVectorization() {
  console.log('=== ベクトル化テスト ===');
  
  try {
    const vectorizer = new TextVectorizer();
    
    const testTexts = [
      'ChatGPTを授業で活用する方法',
      'ChatGPTを教育で使う方法',
      'プログラミング教育について',
      'オンライン授業の進め方'
    ];
    
    console.log('\nテストテキスト:');
    testTexts.forEach((text, i) => {
      console.log(`${i + 1}. ${text}`);
    });
    
    // ベクトル化
    vectorizer.fit(testTexts);
    const vectors = vectorizer.transform(testTexts);
    
    console.log('\n語彙サイズ:', Object.keys(vectorizer.vocabulary).length);
    console.log('ベクトル次元:', vectors[0].length);
    
    // 類似度計算
    console.log('\n類似度行列:');
    for (let i = 0; i < vectors.length; i++) {
      const similarities = [];
      for (let j = 0; j < vectors.length; j++) {
        const sim = vectorizer.cosineSimilarity(vectors[i], vectors[j]);
        similarities.push(sim.toFixed(3));
      }
      console.log(`テキスト${i + 1}: [${similarities.join(', ')}]`);
    }
    
    // 最も類似したペアを見つける
    let maxSim = -1;
    let maxPair = [-1, -1];
    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const sim = vectorizer.cosineSimilarity(vectors[i], vectors[j]);
        if (sim > maxSim) {
          maxSim = sim;
          maxPair = [i, j];
        }
      }
    }
    
    console.log('\n最も類似したペア:');
    console.log(`テキスト${maxPair[0] + 1}: "${testTexts[maxPair[0]]}"`);
    console.log(`テキスト${maxPair[1] + 1}: "${testTexts[maxPair[1]]}"`);
    console.log(`類似度: ${maxSim.toFixed(3)}`);
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * 代表質問生成の詳細テスト
 */
function testRepresentativeGeneration() {
  console.log('=== 代表質問生成詳細テスト ===');
  
  try {
    const clusterer = new QuestionClusterer();
    
    // パスワードを使用して実際の処理を実行
    const result = generateRepresentative('osaka', 'ictedu', true);
    
    console.log('\n処理結果:', result);
    
    if (result.success && result.results) {
      console.log('\n処理された質問数:', result.results.processedCount);
      console.log('生成された代表質問数:', result.results.representativeCount);
      
      if (result.results.representatives && result.results.representatives.length > 0) {
        console.log('\n生成された代表質問:');
        result.results.representatives.forEach((rep, i) => {
          console.log(`\n${i + 1}. ${rep.question}`);
          console.log(`   カテゴリ: ${rep.category}`);
          console.log(`   地域: ${rep.region}`);
          console.log(`   クラスタサイズ: ${rep.clusterSize}`);
          console.log(`   生成方法: ${rep.method}`);
          console.log(`   元質問ID: ${rep.sourceIds ? rep.sourceIds.join(', ') : 'なし'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}