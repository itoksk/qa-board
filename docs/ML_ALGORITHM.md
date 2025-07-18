# QA Board 機械学習アルゴリズム仕様書

## 1. 概要

QA Boardシステムにおける質問集約機能は、機械学習を活用して類似質問を自動的にグループ化し、代表的な質問を生成します。本仕様書では、使用するアルゴリズムと実装方法について詳細に説明します。

## 2. アルゴリズム全体像

### 2.1 処理フロー

```
1. 質問収集
   ↓
2. 前処理（テキストクリーニング）
   ↓
3. ベクトル化（埋め込み生成）
   ↓
4. クラスタリング（K-Means）
   ↓
5. 代表質問選定
   ↓
6. 結果の保存
```

## 3. 各処理の詳細

### 3.1 前処理

#### 3.1.1 テキストクリーニング
```python
def preprocess_text(text):
    # 全角・半角の統一
    text = normalize('NFKC', text)
    
    # 余分な空白の削除
    text = re.sub(r'\s+', ' ', text).strip()
    
    # URLの除去（必要に応じて）
    text = re.sub(r'https?://[\w/:%#\$&\?\(\)~\.=\+\-]+', '', text)
    
    return text
```

#### 3.1.2 ストップワード除去（オプション）
- 日本語の一般的なストップワード（「です」「ます」など）は保持
- 質問の意味理解に重要なため

### 3.2 ベクトル化

#### 3.2.1 使用モデル
**Sentence-BERT（日本語版）**を推奨
```python
from sentence_transformers import SentenceTransformer

# モデルの初期化
model = SentenceTransformer('sonoisa/sentence-bert-base-ja-mean-tokens')

# ベクトル化
def vectorize_questions(questions):
    # 前処理済みの質問リスト
    cleaned_questions = [preprocess_text(q) for q in questions]
    
    # ベクトル化（768次元）
    embeddings = model.encode(cleaned_questions)
    
    return embeddings
```

#### 3.2.2 ベクトル化の特徴
- **次元数**: 768次元
- **正規化**: L2正規化済み
- **意味的類似性**: 文脈を考慮した意味的な類似度を捉える

### 3.3 クラスタリング

#### 3.3.1 最適クラスタ数の決定

**エルボー法**による動的決定
```python
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np

def find_optimal_clusters(embeddings, min_k=2, max_k=10):
    # 質問数に応じて上限を調整
    max_k = min(max_k, len(embeddings) // 2)
    
    inertias = []
    silhouette_scores = []
    
    for k in range(min_k, max_k + 1):
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(embeddings)
        
        inertias.append(kmeans.inertia_)
        if k > 1:
            score = silhouette_score(embeddings, labels)
            silhouette_scores.append(score)
    
    # エルボー点の検出（2次微分が最大の点）
    if len(inertias) > 2:
        diffs = np.diff(inertias)
        diffs2 = np.diff(diffs)
        elbow = np.argmax(diffs2) + min_k + 1
    else:
        elbow = min_k
    
    return elbow
```

#### 3.3.2 K-Meansクラスタリング
```python
def cluster_questions(embeddings, n_clusters):
    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10,
        max_iter=300
    )
    
    labels = kmeans.fit_predict(embeddings)
    centers = kmeans.cluster_centers_
    
    return labels, centers
```

### 3.4 代表質問選定

#### 3.4.1 選定方法

各クラスタから代表質問を選ぶ3つの方法：

1. **重心最近傍法**
```python
def get_centroid_questions(embeddings, labels, centers, questions):
    representative_questions = []
    
    for cluster_id in range(len(centers)):
        # クラスタ内の質問インデックス
        cluster_indices = np.where(labels == cluster_id)[0]
        
        if len(cluster_indices) == 0:
            continue
        
        # クラスタ内の埋め込み
        cluster_embeddings = embeddings[cluster_indices]
        
        # 重心との距離計算
        distances = np.linalg.norm(cluster_embeddings - centers[cluster_id], axis=1)
        
        # 最も近い質問を選択
        nearest_idx = cluster_indices[np.argmin(distances)]
        representative_questions.append({
            'cluster_id': cluster_id,
            'question': questions[nearest_idx],
            'size': len(cluster_indices),
            'member_indices': cluster_indices.tolist()
        })
    
    return representative_questions
```

2. **重要度スコアリング法**
```python
def calculate_importance_score(cluster_data, urgency_flags, like_counts):
    score = 0
    
    # クラスタサイズ（頻度）
    score += cluster_data['size'] * 10
    
    # 緊急度
    urgent_count = sum(urgency_flags[i] for i in cluster_data['member_indices'])
    score += urgent_count * 5
    
    # いいね数
    total_likes = sum(like_counts[i] for i in cluster_data['member_indices'])
    score += total_likes
    
    return score
```

3. **Geminiによる要約生成**
```python
import google.generativeai as genai

def generate_summary_question(cluster_questions, cluster_id):
    # Gemini APIの設定
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-pro')
    
    prompt = f"""
    以下は教育イベントで集められた類似の質問群です。
    これらの質問の共通の意図を捉えた、簡潔で分かりやすい代表質問を1つ生成してください。
    
    質問群：
    {chr(10).join(f'- {q}' for q in cluster_questions)}
    
    代表質問（30文字以内）：
    """
    
    # Gemini APIコール
    response = model.generate_content(prompt)
    
    return response.text
```

### 3.5 実装例（統合版）

```python
import numpy as np
from sklearn.cluster import KMeans
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple

class QuestionClusterer:
    def __init__(self, model_name='sonoisa/sentence-bert-base-ja-mean-tokens'):
        self.model = SentenceTransformer(model_name)
    
    def process_questions(
        self,
        questions: List[str],
        region: str = 'all',
        force_regenerate: bool = False
    ) -> List[Dict]:
        """
        質問を処理して代表質問を生成
        """
        # 1. 前処理
        cleaned_questions = [self.preprocess_text(q) for q in questions]
        
        # 2. ベクトル化
        embeddings = self.model.encode(cleaned_questions)
        
        # 3. 最適クラスタ数の決定
        optimal_k = self.find_optimal_clusters(embeddings)
        
        # 4. クラスタリング
        labels, centers = self.cluster_questions(embeddings, optimal_k)
        
        # 5. 代表質問の選定
        representatives = self.get_representative_questions(
            embeddings, labels, centers, questions
        )
        
        return representatives
    
    def preprocess_text(self, text: str) -> str:
        # テキストクリーニング実装
        pass
    
    def find_optimal_clusters(self, embeddings: np.ndarray) -> int:
        # エルボー法実装
        pass
    
    def cluster_questions(
        self, 
        embeddings: np.ndarray, 
        n_clusters: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        # K-Meansクラスタリング実装
        pass
    
    def get_representative_questions(
        self,
        embeddings: np.ndarray,
        labels: np.ndarray,
        centers: np.ndarray,
        questions: List[str]
    ) -> List[Dict]:
        # 代表質問選定実装
        pass
```

## 4. パフォーマンス最適化

### 4.1 バッチ処理
- 質問数が多い場合は、バッチ単位でベクトル化
- GPUが利用可能な場合は、`device='cuda'`を指定

### 4.2 キャッシング
- 生成したベクトルをRedisにキャッシュ
- 同一質問の再計算を防ぐ

### 4.3 並列処理
- 地域別の処理は並列実行可能
- `multiprocessing`または`asyncio`を使用

## 5. 評価指標

### 5.1 クラスタリング品質
- **シルエット係数**: クラスタの分離度
- **Davies-Bouldin指数**: クラスタ間の分離とクラスタ内の密度

### 5.2 代表質問の品質
- **カバレッジ**: 全質問の何%がカバーされているか
- **多様性**: 代表質問間の意味的距離
- **人間による評価**: 定期的なサンプリング評価

## 6. 実装上の注意点

### 6.1 メモリ管理
- 大量の質問（10,000件以上）の場合は、ミニバッチK-Meansを使用
- ベクトルは`float32`で保存してメモリ使用量を削減

### 6.2 エラーハンドリング
- 空の質問、極端に短い質問の除外
- クラスタ数が質問数を超えないようチェック

### 6.3 多言語対応
- 将来的に英語対応する場合は、`paraphrase-multilingual-MiniLM-L12-v2`モデルを検討

## 7. 参考実装

実際の本番環境では、以下のライブラリの組み合わせを推奨：

```python
# requirements.txt
sentence-transformers==2.2.2
scikit-learn==1.3.0
numpy==1.24.3
pandas==2.0.3
google-generativeai==0.3.2
redis==4.6.0
```

---

**文書情報**
- バージョン: 1.0
- 作成日: 2025年7月17日
- 最終更新: 2025年7月17日