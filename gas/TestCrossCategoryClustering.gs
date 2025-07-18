/**
 * カテゴリをまたいだクラスタリングのテスト
 */
function testCrossCategoryClustering() {
  console.log('=== カテゴリをまたいだクラスタリングテスト ===');
  
  try {
    const clusterer = new QuestionClusterer();
    
    // テスト用の質問データ（異なるカテゴリだが関連性がある）
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
        content: 'AIを使った授業の進め方について知りたい',
        category: 'education',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test3',
        content: 'ChatGPTを教育現場で使う際の注意点は？',
        category: 'ict',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test4',
        content: 'プログラミング教育の効果的な指導方法',
        category: 'education',
        region: 'test',
        processed: false,
        likes: 0
      },
      {
        id: 'test5',
        content: 'Geminiと他のAIツールの比較について',
        category: 'ai',
        region: 'test',
        processed: false,
        likes: 0
      }
    ];
    
    console.log('テスト質問:');
    testQuestions.forEach((q, i) => {
      console.log(`${i + 1}. [${q.category}] ${q.content}`);
    });
    
    // クラスタリング実行
    console.log('\n=== クラスタリング実行 ===');
    const clusters = clusterer.clusterQuestions(testQuestions);
    
    console.log(`生成されたクラスタ数: ${clusters.length}`);
    
    clusters.forEach((cluster, i) => {
      console.log(`\nクラスタ ${i + 1} (${cluster.length}件):`);
      const categories = {};
      cluster.forEach(q => {
        console.log(`  - [${q.category}] ${q.content}`);
        categories[q.category] = (categories[q.category] || 0) + 1;
      });
      console.log(`  カテゴリ分布:`, categories);
    });
    
    // 実際のデータでテスト
    console.log('\n\n=== 実データでのテスト ===');
    const sheetManager = new SheetManager();
    const realQuestions = sheetManager.getQuestions('osaka');
    
    if (realQuestions.length >= 4) {
      console.log(`実データ数: ${realQuestions.length}`);
      
      // カテゴリ分布を表示
      const categoryDist = {};
      realQuestions.forEach(q => {
        categoryDist[q.category] = (categoryDist[q.category] || 0) + 1;
      });
      console.log('カテゴリ分布:', categoryDist);
      
      // 処理を実行（カテゴリをまたいで）
      const result = clusterer.processQuestions('osaka', true, true);
      console.log('\n処理結果:', result);
    }
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * 代表質問の文字数制限を確認
 */
function checkRepresentativeQuestionLength() {
  console.log('=== 代表質問の文字数確認 ===');
  
  try {
    const sheetManager = new SheetManager();
    const representatives = sheetManager.getRepresentativeQuestions('all');
    
    console.log(`代表質問数: ${representatives.length}`);
    
    representatives.forEach((rep, i) => {
      const length = rep.question.length;
      const truncated = rep.question.includes('...');
      console.log(`${i + 1}. [${length}文字] ${truncated ? '省略あり' : '完全'} - ${rep.question}`);
    });
    
    // 統計情報
    const lengths = representatives.map(r => r.question.length);
    if (lengths.length > 0) {
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const max = Math.max(...lengths);
      const min = Math.min(...lengths);
      const truncatedCount = representatives.filter(r => r.question.includes('...')).length;
      
      console.log('\n統計情報:');
      console.log(`平均文字数: ${avg.toFixed(1)}`);
      console.log(`最大文字数: ${max}`);
      console.log(`最小文字数: ${min}`);
      console.log(`省略された質問数: ${truncatedCount} / ${representatives.length}`);
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  console.log('\n=== 確認完了 ===');
}