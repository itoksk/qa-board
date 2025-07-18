/**
 * K-Meansクラスタリング実装（GAS環境用）
 */
class KMeansClusterer {
  constructor() {
    this.maxIterations = 300;
    this.tolerance = 0.0001;
  }
  
  /**
   * K-Meansクラスタリング実行
   */
  cluster(vectors, k, options = {}) {
    const { seed = 42, nInit = 10 } = options;
    
    let bestLabels = null;
    let bestCenters = null;
    let bestInertia = Infinity;
    
    // n_init回実行して最良の結果を選択
    for (let init = 0; init < nInit; init++) {
      const { labels, centers, inertia } = this.runKMeans(vectors, k, seed + init);
      
      if (inertia < bestInertia) {
        bestInertia = inertia;
        bestLabels = labels;
        bestCenters = centers;
      }
    }
    
    return {
      labels: bestLabels,
      centers: bestCenters,
      inertia: bestInertia
    };
  }
  
  /**
   * K-Meansの1回の実行
   */
  runKMeans(vectors, k, seed) {
    const n = vectors.length;
    const dim = vectors[0].length;
    
    // 初期中心点の選択（K-Means++）
    const centers = this.initializeCentersKMeansPlusPlus(vectors, k, seed);
    let labels = new Array(n).fill(-1);
    let prevInertia = Infinity;
    
    for (let iter = 0; iter < this.maxIterations; iter++) {
      // 割り当てステップ
      const newLabels = this.assignClusters(vectors, centers);
      
      // 収束チェック
      if (this.arraysEqual(labels, newLabels)) {
        labels = newLabels;
        break;
      }
      
      labels = newLabels;
      
      // 更新ステップ
      const newCenters = this.updateCenters(vectors, labels, k, dim);
      
      // 慣性の計算
      const inertia = this.calculateInertia(vectors, labels, newCenters);
      
      // 収束チェック（慣性の変化）
      if (Math.abs(prevInertia - inertia) < this.tolerance) {
        centers.splice(0, centers.length, ...newCenters);
        break;
      }
      
      prevInertia = inertia;
      centers.splice(0, centers.length, ...newCenters);
    }
    
    const finalInertia = this.calculateInertia(vectors, labels, centers);
    
    return {
      labels: labels,
      centers: centers,
      inertia: finalInertia
    };
  }
  
  /**
   * K-Means++による初期化
   */
  initializeCentersKMeansPlusPlus(vectors, k, seed) {
    const n = vectors.length;
    const centers = [];
    
    // 乱数生成器（シード付き）
    const random = this.createSeededRandom(seed);
    
    // 最初の中心点をランダムに選択
    const firstIndex = Math.floor(random() * n);
    centers.push([...vectors[firstIndex]]);
    
    // 残りのk-1個の中心点を選択
    for (let c = 1; c < k; c++) {
      const distances = vectors.map(vector => {
        const minDist = centers.reduce((min, center) => {
          const dist = this.euclideanDistance(vector, center);
          return Math.min(min, dist);
        }, Infinity);
        return minDist * minDist; // 距離の2乗
      });
      
      // 確率的に選択
      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      const threshold = random() * totalDist;
      
      let cumSum = 0;
      for (let i = 0; i < n; i++) {
        cumSum += distances[i];
        if (cumSum >= threshold) {
          centers.push([...vectors[i]]);
          break;
        }
      }
    }
    
    return centers;
  }
  
  /**
   * クラスタ割り当て
   */
  assignClusters(vectors, centers) {
    return vectors.map(vector => {
      let minDist = Infinity;
      let bestCluster = 0;
      
      centers.forEach((center, idx) => {
        const dist = this.euclideanDistance(vector, center);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = idx;
        }
      });
      
      return bestCluster;
    });
  }
  
  /**
   * 中心点の更新
   */
  updateCenters(vectors, labels, k, dim) {
    const newCenters = [];
    
    for (let c = 0; c < k; c++) {
      const clusterVectors = [];
      
      labels.forEach((label, idx) => {
        if (label === c) {
          clusterVectors.push(vectors[idx]);
        }
      });
      
      if (clusterVectors.length > 0) {
        // 平均を計算
        const center = new Array(dim).fill(0);
        clusterVectors.forEach(vector => {
          vector.forEach((val, i) => {
            center[i] += val;
          });
        });
        
        center.forEach((val, i) => {
          center[i] = val / clusterVectors.length;
        });
        
        newCenters.push(center);
      } else {
        // 空のクラスタの場合、ランダムな点を選択
        const randomIdx = Math.floor(Math.random() * vectors.length);
        newCenters.push([...vectors[randomIdx]]);
      }
    }
    
    return newCenters;
  }
  
  /**
   * 慣性（クラスタ内分散）の計算
   */
  calculateInertia(vectors, labels, centers) {
    let inertia = 0;
    
    labels.forEach((label, idx) => {
      const dist = this.euclideanDistance(vectors[idx], centers[label]);
      inertia += dist * dist;
    });
    
    return inertia;
  }
  
  /**
   * ユークリッド距離
   */
  euclideanDistance(vec1, vec2) {
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      const diff = vec1[i] - vec2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
  
  /**
   * 配列の等価性チェック
   */
  arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }
  
  /**
   * シード付き乱数生成器
   */
  createSeededRandom(seed) {
    let s = seed;
    return function() {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
  
  /**
   * 最適なクラスタ数を見つける（エルボー法）
   */
  findOptimalClusters(vectors, minK = 2, maxK = 10) {
    maxK = Math.min(maxK, Math.floor(vectors.length / 2));
    
    const inertias = [];
    const silhouetteScores = [];
    
    for (let k = minK; k <= maxK; k++) {
      const { labels, centers, inertia } = this.cluster(vectors, k);
      inertias.push(inertia);
      
      if (k > 1) {
        const score = this.calculateSilhouetteScore(vectors, labels);
        silhouetteScores.push(score);
      }
    }
    
    // エルボー点の検出
    if (inertias.length > 2) {
      const diffs = [];
      for (let i = 1; i < inertias.length; i++) {
        diffs.push(inertias[i-1] - inertias[i]);
      }
      
      const diffs2 = [];
      for (let i = 1; i < diffs.length; i++) {
        diffs2.push(diffs[i-1] - diffs[i]);
      }
      
      let maxDiff2 = -Infinity;
      let elbowIdx = 0;
      diffs2.forEach((diff, idx) => {
        if (diff > maxDiff2) {
          maxDiff2 = diff;
          elbowIdx = idx;
        }
      });
      
      return minK + elbowIdx + 1;
    }
    
    return minK;
  }
  
  /**
   * シルエット係数の計算
   */
  calculateSilhouetteScore(vectors, labels) {
    const n = vectors.length;
    const k = Math.max(...labels) + 1;
    
    let totalScore = 0;
    
    for (let i = 0; i < n; i++) {
      const clusterIdx = labels[i];
      
      // a(i): 同じクラスタ内の平均距離
      let sameClusterDist = 0;
      let sameClusterCount = 0;
      
      for (let j = 0; j < n; j++) {
        if (i !== j && labels[j] === clusterIdx) {
          sameClusterDist += this.euclideanDistance(vectors[i], vectors[j]);
          sameClusterCount++;
        }
      }
      
      const a = sameClusterCount > 0 ? sameClusterDist / sameClusterCount : 0;
      
      // b(i): 最も近い他クラスタとの平均距離
      let b = Infinity;
      
      for (let c = 0; c < k; c++) {
        if (c !== clusterIdx) {
          let otherClusterDist = 0;
          let otherClusterCount = 0;
          
          for (let j = 0; j < n; j++) {
            if (labels[j] === c) {
              otherClusterDist += this.euclideanDistance(vectors[i], vectors[j]);
              otherClusterCount++;
            }
          }
          
          if (otherClusterCount > 0) {
            const avgDist = otherClusterDist / otherClusterCount;
            b = Math.min(b, avgDist);
          }
        }
      }
      
      // シルエット係数
      const s = (b - a) / Math.max(a, b);
      totalScore += s;
    }
    
    return totalScore / n;
  }
}