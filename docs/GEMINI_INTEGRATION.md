# Gemini API 統合ガイド

## 1. 概要

QA Boardシステムでは、代表質問の生成にGoogle Gemini APIを使用します。本ドキュメントでは、Gemini APIの統合方法と実装例を説明します。

## 2. セットアップ

### 2.1 APIキーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. Googleアカウントでログイン
3. 「Get API key」をクリック
4. 新しいAPIキーを生成

### 2.2 ライブラリのインストール

```bash
pip install google-generativeai
```

## 3. 実装例

### 3.1 基本的な使用方法

```python
import google.generativeai as genai
import os

# APIキーの設定（環境変数から読み込み）
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

# モデルの初期化
model = genai.GenerativeModel('gemini-pro')
```

### 3.2 代表質問生成の実装

```python
class GeminiQuestionGenerator:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def generate_representative_question(
        self, 
        cluster_questions: List[str], 
        cluster_id: int,
        region: str = ""
    ) -> Dict[str, str]:
        """
        クラスタ内の質問群から代表質問を生成
        """
        region_text = f"（{region}地域）" if region else ""
        
        prompt = f"""
        あなたは教育イベントの質問を分析する専門家です。
        以下は{region_text}教育イベントで収集された類似の質問群です。
        
        これらの質問に共通する本質的な疑問や関心事を理解し、
        それを的確に表現する代表的な質問を1つ生成してください。
        
        要件：
        - 30文字以内で簡潔に
        - 専門用語は避け、分かりやすい表現で
        - 質問の核心を捉える
        - 「〜ですか？」「〜でしょうか？」の形式で
        
        質問群：
        {self._format_questions(cluster_questions)}
        
        代表質問：
        """
        
        try:
            response = self.model.generate_content(
                prompt,
                generation_config={
                    'temperature': 0.7,
                    'top_p': 0.8,
                    'top_k': 40,
                    'max_output_tokens': 100,
                }
            )
            
            return {
                'cluster_id': cluster_id,
                'representative_question': response.text.strip(),
                'source_count': len(cluster_questions),
                'status': 'success'
            }
            
        except Exception as e:
            return {
                'cluster_id': cluster_id,
                'representative_question': cluster_questions[0],  # フォールバック
                'source_count': len(cluster_questions),
                'status': 'error',
                'error_message': str(e)
            }
    
    def _format_questions(self, questions: List[str]) -> str:
        """質問リストをフォーマット"""
        return '\n'.join(f'{i+1}. {q}' for i, q in enumerate(questions[:10]))
    
    def generate_summary_with_details(
        self, 
        cluster_questions: List[str],
        metadata: Dict = None
    ) -> Dict[str, Any]:
        """
        より詳細な要約を生成（タイトル＋説明）
        """
        prompt = f"""
        以下の質問群を分析し、要約してください。
        
        質問群：
        {self._format_questions(cluster_questions)}
        
        以下の形式で回答してください：
        
        【タイトル】（20文字以内）
        質問群の主題を端的に表すタイトル
        
        【要約】（50文字以内）
        共通する関心事や疑問点の説明
        
        【キーワード】
        重要なキーワードを3つまで
        """
        
        response = self.model.generate_content(prompt)
        
        # レスポンスをパース（実装は省略）
        return self._parse_structured_response(response.text)
```

### 3.3 バッチ処理の実装

```python
async def process_clusters_batch(
    clusters: List[List[str]], 
    generator: GeminiQuestionGenerator
) -> List[Dict]:
    """
    複数のクラスタを効率的に処理
    """
    results = []
    
    # レート制限を考慮（1分間に60リクエストまで）
    for i, cluster_questions in enumerate(clusters):
        result = generator.generate_representative_question(
            cluster_questions, 
            cluster_id=i
        )
        results.append(result)
        
        # レート制限回避のための待機
        if (i + 1) % 10 == 0:
            await asyncio.sleep(1)
    
    return results
```

## 4. エラーハンドリング

### 4.1 一般的なエラーと対処法

```python
def handle_gemini_errors(func):
    """Gemini APIエラーのデコレータ"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except genai.types.BlockedPromptException:
            # セーフティフィルターによるブロック
            return {
                'error': 'content_blocked',
                'message': '内容が不適切と判断されました'
            }
        except genai.types.StopCandidateException:
            # 生成が途中で停止
            return {
                'error': 'generation_stopped',
                'message': '生成が完了しませんでした'
            }
        except Exception as e:
            # その他のエラー
            return {
                'error': 'unknown',
                'message': str(e)
            }
    return wrapper
```

## 5. プロンプトエンジニアリング

### 5.1 効果的なプロンプトのコツ

1. **明確な指示**: 期待する出力形式を具体的に記述
2. **文脈の提供**: 教育イベントという文脈を明示
3. **制約の設定**: 文字数制限などを明確に
4. **例の提示**: 必要に応じて良い例を提供

### 5.2 プロンプトテンプレート集

```python
PROMPT_TEMPLATES = {
    'simple_summary': """
        質問群：{questions}
        
        上記の質問の共通テーマを30文字以内で要約：
    """,
    
    'detailed_analysis': """
        教育分野：{category}
        地域：{region}
        
        質問群：
        {questions}
        
        分析結果：
        1. 主要な関心事：
        2. 共通する疑問点：
        3. 推奨される代表質問：
    """,
    
    'keyword_extraction': """
        以下の質問群から重要なキーワードを3つ抽出してください。
        
        {questions}
        
        キーワード（カンマ区切り）：
    """
}
```

## 6. パフォーマンス最適化

### 6.1 キャッシング戦略

```python
import hashlib
import json
from typing import Optional

class GeminiCache:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 86400  # 24時間
    
    def get_cached_response(self, questions: List[str]) -> Optional[str]:
        """キャッシュから取得"""
        cache_key = self._generate_cache_key(questions)
        return self.redis.get(cache_key)
    
    def set_cached_response(self, questions: List[str], response: str):
        """キャッシュに保存"""
        cache_key = self._generate_cache_key(questions)
        self.redis.setex(cache_key, self.ttl, response)
    
    def _generate_cache_key(self, questions: List[str]) -> str:
        """質問リストからキャッシュキーを生成"""
        content = json.dumps(sorted(questions), ensure_ascii=False)
        return f"gemini:summary:{hashlib.md5(content.encode()).hexdigest()}"
```

## 7. コスト管理

### 7.1 使用量の追跡

```python
class GeminiUsageTracker:
    def __init__(self):
        self.daily_requests = 0
        self.daily_tokens = 0
    
    def track_request(self, input_tokens: int, output_tokens: int):
        """リクエストとトークン数を記録"""
        self.daily_requests += 1
        self.daily_tokens += input_tokens + output_tokens
    
    def get_estimated_cost(self) -> float:
        """推定コストを計算（2024年1月時点の料金）"""
        # Gemini Pro: $0.00025 per 1K characters
        estimated_chars = self.daily_tokens * 4  # 概算
        return (estimated_chars / 1000) * 0.00025
```

## 8. セキュリティ考慮事項

### 8.1 APIキーの管理

- 環境変数での管理を推奨
- ハードコーディングは避ける
- 定期的なキーのローテーション

### 8.2 入力のサニタイゼーション

```python
def sanitize_input(text: str) -> str:
    """入力テキストのサニタイゼーション"""
    # 個人情報のマスキング
    text = re.sub(r'\b\d{3}-\d{4}-\d{4}\b', '[電話番号]', text)
    text = re.sub(r'\b[\w\.-]+@[\w\.-]+\.\w+\b', '[メールアドレス]', text)
    
    # 不適切な内容の除去
    # ...
    
    return text
```

## 9. テストとデバッグ

### 9.1 ユニットテストの例

```python
import unittest
from unittest.mock import Mock, patch

class TestGeminiIntegration(unittest.TestCase):
    def setUp(self):
        self.generator = GeminiQuestionGenerator('test_api_key')
    
    @patch('google.generativeai.GenerativeModel')
    def test_generate_representative_question(self, mock_model):
        # モックの設定
        mock_response = Mock()
        mock_response.text = "AIを教育にどう活用すべきですか？"
        mock_model.return_value.generate_content.return_value = mock_response
        
        # テスト実行
        questions = [
            "ChatGPTを授業で使う方法は？",
            "AIツールの教育活用について"
        ]
        result = self.generator.generate_representative_question(questions, 0)
        
        # アサーション
        self.assertEqual(result['status'], 'success')
        self.assertIn('活用', result['representative_question'])
```

---

**文書情報**
- バージョン: 1.0
- 作成日: 2025年7月17日
- 最終更新: 2025年7月17日