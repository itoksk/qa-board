/**
 * 代表質問生成の総合テスト
 */
function testRepresentativeGenerationFull() {
  console.log('=== 代表質問生成総合テスト ===');
  
  try {
    const sheetManager = new SheetManager();
    
    // テスト用の類似質問を追加
    const testQuestions = [
      // AIカテゴリの類似質問群
      {
        region: 'test',
        category: 'ai',
        content: 'ChatGPTを授業で活用する方法を教えてください',
        author: 'テスト1'
      },
      {
        region: 'test',
        category: 'ai',
        content: 'ChatGPTを教育現場で使う際の注意点は何ですか？',
        author: 'テスト2'
      },
      {
        region: 'test',
        category: 'ai',
        content: '生成AIを授業に導入する際のガイドラインは？',
        author: 'テスト3'
      },
      // 教育カテゴリの類似質問群
      {
        region: 'test',
        category: 'education',
        content: 'プログラミング教育を始めるにはどうすればいいですか？',
        author: 'テスト4'
      },
      {
        region: 'test',
        category: 'education',
        content: 'プログラミング教育の効果的な進め方を教えてください',
        author: 'テスト5'
      }
    ];
    
    console.log('テスト質問を追加中...');
    const addedIds = [];
    
    testQuestions.forEach(q => {
      const question = {
        id: Utilities.getUuid(),
        region: q.region,
        category: q.category,
        content: q.content,
        author: q.author,
        timestamp: new Date().toISOString(),
        status: 'new',
        processed: false,
        likes: 0
      };
      
      sheetManager.addQuestion(question);
      addedIds.push(question.id);
      console.log(`追加: ${q.content}`);
    });
    
    console.log(`\n${testQuestions.length}件のテスト質問を追加しました`);
    
    // 代表質問生成を実行
    console.log('\n代表質問生成を実行中...');
    const result = generateRepresentative('test', 'ictedu', true);
    
    if (result.success) {
      console.log('\n✅ 生成成功');
      console.log('処理された質問数:', result.results.processedCount);
      console.log('生成された代表質問数:', result.results.representativeCount);
      
      // 生成された代表質問を確認
      const representatives = sheetManager.getRepresentativeQuestions('test');
      console.log('\n生成された代表質問:');
      representatives.forEach((rep, i) => {
        console.log(`\n${i + 1}. ${rep.question}`);
        console.log(`   カテゴリ: ${rep.category}`);
        console.log(`   クラスタサイズ: ${rep.clusterSize}`);
        console.log(`   生成方法: ${rep.method}`);
        console.log(`   元質問ID数: ${rep.sourceIds ? rep.sourceIds.length : 0}`);
        
        if (rep.sourceIds && rep.sourceIds.length > 0) {
          console.log('   元の質問:');
          const sourceQuestions = sheetManager.getQuestionsByIds(rep.sourceIds);
          sourceQuestions.forEach(sq => {
            console.log(`     - ${sq.content}`);
          });
        }
      });
    } else {
      console.log('❌ 生成失敗:', result.error);
    }
    
    // テストデータをクリーンアップ
    console.log('\nテストデータをクリーンアップ中...');
    // 注: 実際の実装では、テスト地域の質問を削除する処理を追加
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * 簡易的な代表質問生成テスト
 */
function testSimpleRepresentative() {
  console.log('=== 簡易代表質問生成テスト ===');
  
  try {
    const clusterer = new QuestionClusterer();
    
    // テスト用の質問群
    const testCluster = [
      {
        id: 'test1',
        content: 'ChatGPTを授業で活用する方法を教えてください',
        category: 'ai',
        likes: 0
      },
      {
        id: 'test2',
        content: 'ChatGPTを教育現場で使う際の注意点は？',
        category: 'ai',
        likes: 1
      },
      {
        id: 'test3',
        content: '生成AIの教育利用におけるガイドラインは？',
        category: 'ai',
        likes: 2
      }
    ];
    
    console.log('テストクラスタの質問:');
    testCluster.forEach((q, i) => {
      console.log(`${i + 1}. ${q.content}`);
    });
    
    // 代表質問を生成
    console.log('\n代表質問生成中...');
    const representative = clusterer.generateRepresentative(testCluster, 'ai', 'test');
    
    console.log('\n生成結果:');
    console.log('代表質問:', representative.question);
    console.log('生成方法:', representative.method);
    console.log('クラスタサイズ:', representative.clusterSize);
    console.log('元質問ID:', representative.sourceIds);
    console.log('重要度スコア:', representative.importanceScore);
    
    // フォールバック処理のテスト
    console.log('\n\n=== フォールバック処理のテスト ===');
    const fallbackSummary = clusterer.generateFallbackSummary(testCluster, 'ai');
    console.log('フォールバック要約:', fallbackSummary);
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}