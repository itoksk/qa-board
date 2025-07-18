/**
 * テキストベクトル化クラス（GAS環境用）
 * TF-IDFベースの簡易実装
 */
class TextVectorizer {
  constructor() {
    this.vocabulary = {};
    this.idf = {};
    this.documents = [];
  }
  
  /**
   * テキストの前処理
   */
  preprocessText(text) {
    // 全角・半角の統一
    text = this.normalizeText(text);
    
    // 余分な空白の削除
    text = text.replace(/\s+/g, ' ').trim();
    
    // URLの除去
    text = text.replace(/https?:\/\/[^\s]+/g, '');
    
    // 記号の正規化
    text = text.replace(/[！？]/g, match => {
      return match === '！' ? '!' : '?';
    });
    
    return text;
  }
  
  /**
   * 全角・半角の正規化
   */
  normalizeText(text) {
    // 半角カナを全角に
    const halfKana = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝｧｨｩｪｫｬｭｮｯ';
    const fullKana = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンァィゥェォャュョッ';
    
    for (let i = 0; i < halfKana.length; i++) {
      text = text.replace(new RegExp(halfKana[i], 'g'), fullKana[i]);
    }
    
    // 全角英数字を半角に
    text = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, match => {
      return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
    });
    
    return text;
  }
  
  /**
   * 単語分割（簡易版）
   */
  tokenize(text) {
    // 日本語の単語分割は難しいため、文字N-gramを使用
    const n = 2; // bi-gram
    const tokens = [];
    
    // 句読点で分割
    const sentences = text.split(/[。、！？\s]+/);
    
    sentences.forEach(sentence => {
      if (sentence.length < n) {
        tokens.push(sentence);
      } else {
        for (let i = 0; i <= sentence.length - n; i++) {
          tokens.push(sentence.substring(i, i + n));
        }
      }
    });
    
    // 重要な単語は個別に抽出
    const importantWords = text.match(/[A-Za-z]+|AI|ICT|ChatGPT|生成AI|教育|授業|活用|方法|注意|倫理/g) || [];
    tokens.push(...importantWords);
    
    return tokens.filter(token => token.length > 0);
  }
  
  /**
   * コーパスをフィットしてIDFを計算
   */
  fit(documents) {
    this.documents = documents.map(doc => this.preprocessText(doc));
    const documentCount = this.documents.length;
    const tokenDocumentCount = {};
    
    // 各文書のユニークトークンをカウント
    this.documents.forEach((doc, docIndex) => {
      const tokens = this.tokenize(doc);
      const uniqueTokens = [...new Set(tokens)];
      
      uniqueTokens.forEach(token => {
        if (!this.vocabulary[token]) {
          this.vocabulary[token] = Object.keys(this.vocabulary).length;
        }
        
        if (!tokenDocumentCount[token]) {
          tokenDocumentCount[token] = 0;
        }
        tokenDocumentCount[token]++;
      });
    });
    
    // IDF計算
    Object.keys(this.vocabulary).forEach(token => {
      const df = tokenDocumentCount[token] || 0;
      this.idf[token] = Math.log((documentCount + 1) / (df + 1)) + 1;
    });
  }
  
  /**
   * TF-IDFベクトルに変換
   */
  transform(documents) {
    const vectors = [];
    
    documents.forEach(doc => {
      const preprocessedDoc = this.preprocessText(doc);
      const tokens = this.tokenize(preprocessedDoc);
      const vector = new Array(Object.keys(this.vocabulary).length).fill(0);
      
      // TF計算
      const tokenCounts = {};
      tokens.forEach(token => {
        tokenCounts[token] = (tokenCounts[token] || 0) + 1;
      });
      
      // TF-IDF計算
      Object.keys(tokenCounts).forEach(token => {
        if (this.vocabulary[token] !== undefined) {
          const tf = tokenCounts[token] / tokens.length;
          const tfidf = tf * (this.idf[token] || 0);
          vector[this.vocabulary[token]] = tfidf;
        }
      });
      
      // L2正規化
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        vector.forEach((val, i) => {
          vector[i] = val / norm;
        });
      }
      
      vectors.push(vector);
    });
    
    return vectors;
  }
  
  /**
   * コサイン類似度計算
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
    }
    return dotProduct;
  }
}