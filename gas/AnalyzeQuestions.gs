/**
 * 質問データの分析
 */
function analyzeQuestionData() {
  console.log('=== 質問データ分析 ===');
  
  try {
    const sheetManager = new SheetManager();
    
    // 全地域のデータを取得
    const regions = ['osaka', 'nagoya', 'fukuoka', 'hiroshima', 'tokyo'];
    
    regions.forEach(region => {
      console.log(`\n【${region}地域】`);
      const questions = sheetManager.getQuestions(region);
      console.log(`質問数: ${questions.length}`);
      
      if (questions.length > 0) {
        // カテゴリ別に集計
        const categoryCount = {};
        questions.forEach(q => {
          const cat = q.category || 'その他';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        
        console.log('カテゴリ別内訳:');
        Object.entries(categoryCount).forEach(([cat, count]) => {
          console.log(`  - ${cat}: ${count}件`);
        });
      }
    });
    
    // 全体のカテゴリ分布
    console.log('\n【全体のカテゴリ分布】');
    const allQuestions = sheetManager.getQuestions('all');
    const globalCategoryCount = {};
    
    allQuestions.forEach(q => {
      const cat = q.category || 'その他';
      globalCategoryCount[cat] = (globalCategoryCount[cat] || 0) + 1;
    });
    
    Object.entries(globalCategoryCount).forEach(([cat, count]) => {
      console.log(`${cat}: ${count}件`);
      
      // カテゴリ内の質問を表示
      if (count > 1) {
        console.log('  質問内容:');
        allQuestions
          .filter(q => q.category === cat)
          .forEach((q, i) => {
            console.log(`    ${i + 1}. ${q.content.substring(0, 50)}...`);
          });
      }
    });
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  console.log('\n=== 分析完了 ===');
}

/**
 * 類似質問のテストデータを追加
 */
function addSimilarTestQuestions() {
  console.log('=== 類似質問のテストデータ追加 ===');
  
  try {
    const sheetManager = new SheetManager();
    
    // AI関連の類似質問
    const aiQuestions = [
      {
        region: 'osaka',
        category: 'ai',
        content: 'ChatGPTを授業で使う際の注意点を教えてください',
        author: 'テスト教員A'
      },
      {
        region: 'osaka',
        category: 'ai',
        content: '生成AIを教育現場で活用する方法について知りたい',
        author: 'テスト教員B'
      },
      {
        region: 'osaka',
        category: 'ai',
        content: 'AI活用時の著作権や倫理的な配慮について',
        author: 'テスト教員C'
      },
      {
        region: 'osaka',
        category: 'ai',
        content: 'Geminiを使った教材作成のコツは？',
        author: 'テスト教員D'
      }
    ];
    
    // 教育関連の類似質問
    const educationQuestions = [
      {
        region: 'osaka',
        category: 'education',
        content: 'アクティブラーニングの導入方法について',
        author: 'テスト教員E'
      },
      {
        region: 'osaka',
        category: 'education',
        content: '協働学習を効果的に進めるには？',
        author: 'テスト教員F'
      },
      {
        region: 'osaka',
        category: 'education',
        content: '探究的な学習の評価方法を教えてください',
        author: 'テスト教員G'
      }
    ];
    
    // ICT関連の類似質問
    const ictQuestions = [
      {
        region: 'osaka',
        category: 'ict',
        content: 'タブレット端末を授業で効果的に使う方法',
        author: 'テスト教員H'
      },
      {
        region: 'osaka',
        category: 'ict',
        content: 'オンライン授業と対面授業のハイブリッド型について',
        author: 'テスト教員I'
      },
      {
        region: 'osaka',
        category: 'ict',
        content: 'デジタル教科書の活用方法を知りたい',
        author: 'テスト教員J'
      }
    ];
    
    // すべての質問を追加
    const allTestQuestions = [...aiQuestions, ...educationQuestions, ...ictQuestions];
    
    console.log(`${allTestQuestions.length}件のテスト質問を追加中...`);
    
    allTestQuestions.forEach(q => {
      const question = {
        id: Utilities.getUuid(),
        region: q.region,
        category: q.category,
        content: q.content,
        author: q.author,
        timestamp: new Date().toISOString(),
        status: 'new',
        processed: false,
        likes: Math.floor(Math.random() * 5) // 0-4のランダムないいね数
      };
      
      sheetManager.addQuestion(question);
      console.log(`追加: [${q.category}] ${q.content.substring(0, 30)}...`);
    });
    
    console.log('\n✅ テストデータの追加が完了しました');
    
    // 追加後のデータを分析
    analyzeQuestionData();
    
  } catch (error) {
    console.error('エラー:', error);
  }
  
  console.log('\n=== 完了 ===');
}