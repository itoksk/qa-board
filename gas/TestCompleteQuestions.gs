/**
 * 代表質問が完全に生成されるかテスト
 */
function testCompleteQuestionGeneration() {
  console.log('=== 完全な質問生成テスト ===');
  
  try {
    const geminiService = new GeminiService();
    
    // テスト用の質問群
    const testCases = [
      {
        name: '複雑な質問群',
        questions: [
          'ChatGPTを中学校の英語授業で使う際の効果的な活用方法と、生徒のプライバシー保護についての注意点を教えてください',
          'GeminiとChatGPTの違いを理解した上で、それぞれを教育現場でどのように使い分ければよいでしょうか',
          '生成AIを使った授業を行う際に、著作権や倫理的な問題についてどのように生徒に説明すればよいですか'
        ],
        category: 'ai',
        region: 'test'
      },
      {
        name: 'シンプルな質問群',
        questions: [
          'タブレットの活用方法は？',
          'ICT教育の進め方を教えて',
          'オンライン授業のコツは？'
        ],
        category: 'ict',
        region: 'test'
      },
      {
        name: '長い質問群',
        questions: [
          'アクティブラーニングを導入する際に、従来の講義形式との違いをどのように説明し、保護者の理解を得ながら、段階的に移行していくための具体的なステップを教えてください',
          '探究的な学習を進める中で、生徒の主体性を引き出しつつ、学習指導要領の内容も確実にカバーするためのバランスの取り方について、実践的なアドバイスをお願いします'
        ],
        category: 'education',
        region: 'test'
      }
    ];
    
    // 各テストケースを実行
    testCases.forEach(testCase => {
      console.log(`\n--- ${testCase.name} ---`);
      console.log('元の質問:');
      testCase.questions.forEach((q, i) => {
        console.log(`${i + 1}. ${q}`);
      });
      
      try {
        const result = geminiService.generateSummary(
          testCase.questions,
          testCase.category,
          testCase.region
        );
        
        console.log('\n生成された代表質問:');
        console.log(result);
        console.log(`文字数: ${result.length}`);
        console.log(`完結している: ${result.endsWith('？') || result.endsWith('?') ? 'はい' : 'いいえ'}`);
        
        // 長さの評価
        if (result.length < 30) {
          console.warn('⚠️ 質問が短すぎる可能性があります');
        } else if (result.length > 100) {
          console.warn('⚠️ 質問が長すぎる可能性があります');
        } else {
          console.log('✅ 適切な長さです');
        }
        
        // 途切れているかチェック
        if (result.includes('...') && !result.includes('...？')) {
          console.warn('⚠️ 質問が途中で切れている可能性があります');
        }
        
      } catch (error) {
        console.error('生成エラー:', error);
      }
    });
    
  } catch (error) {
    console.error('テストエラー:', error);
    console.error('スタックトレース:', error.stack);
  }
  
  console.log('\n=== テスト完了 ===');
}

/**
 * 実際の代表質問をチェック
 */
function checkExistingRepresentativeQuestions() {
  console.log('=== 既存の代表質問チェック ===');
  
  try {
    const sheetManager = new SheetManager();
    const representatives = sheetManager.getRepresentativeQuestions('all');
    
    let incompleteCount = 0;
    let truncatedCount = 0;
    
    console.log(`代表質問総数: ${representatives.length}`);
    
    representatives.forEach((rep, i) => {
      const question = rep.question;
      const isComplete = question.endsWith('？') || question.endsWith('?');
      const isTruncated = question.includes('...') && !question.includes('...？');
      
      if (!isComplete) {
        incompleteCount++;
        console.log(`\n不完全な質問 ${i + 1}:`);
        console.log(`  質問: ${question}`);
        console.log(`  文字数: ${question.length}`);
        console.log(`  生成方法: ${rep.method}`);
      }
      
      if (isTruncated) {
        truncatedCount++;
        console.log(`\n途切れた質問 ${i + 1}:`);
        console.log(`  質問: ${question}`);
        console.log(`  文字数: ${question.length}`);
      }
    });
    
    console.log('\n=== サマリー ===');
    console.log(`不完全な質問数: ${incompleteCount} / ${representatives.length}`);
    console.log(`途切れた質問数: ${truncatedCount} / ${representatives.length}`);
    
    if (incompleteCount > 0 || truncatedCount > 0) {
      console.log('\n💡 推奨: 強制再生成を実行して、完全な質問を生成してください');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  console.log('\n=== チェック完了 ===');
}

/**
 * Gemini APIの応答をデバッグ
 */
function debugGeminiResponse() {
  console.log('=== Gemini API デバッグ ===');
  
  try {
    const geminiService = new GeminiService();
    
    // シンプルなテスト
    const testQuestions = [
      'ChatGPTの使い方を教えてください',
      'Geminiはどんなことができますか'
    ];
    
    console.log('テスト質問:', testQuestions);
    
    // 内部的にconsole.logが出力される
    const result = geminiService.generateSummary(testQuestions, 'ai', 'test');
    
    console.log('\n最終結果:', result);
    
  } catch (error) {
    console.error('エラー:', error);
    console.error('詳細:', error.toString());
  }
  
  console.log('\n=== デバッグ完了 ===');
}