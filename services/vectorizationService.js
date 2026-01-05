/**
 * Service for vectorizing items and grouping similar ones together using KMeans clustering
 * with a second-pass merge to collapse under-merged clusters.
 */

if (!process.env.OPENAI_API_KEY) {
    require("dotenv").config();
  }
  
  const { openai } = require("@ai-sdk/openai");
  const { embedMany } = require("ai");
  const kmeans = require("ml-kmeans");
  
  if (typeof openai !== "function") {
    throw new Error("Failed to import openai from @ai-sdk/openai");
  }
  
  const DEFAULT_MAX_CLUSTERS = 50;
  
  // If items still look split, lower this (e.g. 0.88 -> 0.86).
  // If it over-merges distinct items, raise it (e.g. 0.90 -> 0.92).
  const MERGE_SIMILARITY_THRESHOLD = 0.88;
  
  // Optional: tiny lexical normalization to help plural/small punctuation diffs.
  // Keep it conservative to avoid merging different dishes accidentally.
  function normalizeForEmbedding(str) {
    return String(str || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, " and ")
      .replace(/['"]/g, "")
      .replace(/[^\p{L}\p{N}\s]+/gu, " ") // unicode-safe
      .replace(/\bwith\b/g, " ")
      .replace(/\bthe\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  function normalizeForKey(str) {
    // Slightly stronger normalization for grouping (still conservative)
    return normalizeForEmbedding(str)
      .replace(/\bchips\b/g, "chip")
      .replace(/\bburritos\b/g, "burrito")
      .replace(/\btacos\b/g, "taco")
      .replace(/\bsalsas\b/g, "salsa")
      .trim();
  }
  
  function titleCase(str) {
    return String(str || "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  
  function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return -1;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    if (!denom) return -1;
    return dot / denom;
  }
  
  function cosineDistance(a, b) {
    const s = cosineSimilarity(a, b);
    if (s < -0.5) return Infinity;
    return 1 - s;
  }
  
  async function getEmbeddings(texts) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY is not configured. Please set it in your .env file."
      );
    }
  
    const values = (texts || []).map((t) => normalizeForEmbedding(t));
    if (values.length === 0) return [];
  
    try {
      const { embeddings } = await embedMany({
        model: openai.embedding("text-embedding-3-small"),
        values,
      });
      return embeddings;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw new Error(
        "Embedding generation failed. Please check OpenAI API key and model availability."
      );
    }
  }
  
  /**
   * Silhouette using cosine distance (better for embeddings than euclidean).
   */
  function calculateSilhouetteScore(embeddings, labels) {
    if (!embeddings?.length || !labels?.length) return -1;
  
    const unique = Array.from(new Set(labels));
    if (unique.length < 2) return -1;
  
    let total = 0;
  
    for (let i = 0; i < embeddings.length; i++) {
      const point = embeddings[i];
      const label = labels[i];
  
      // a(i): avg distance within same cluster
      let a = 0;
      let aCount = 0;
      for (let j = 0; j < embeddings.length; j++) {
        if (i === j) continue;
        if (labels[j] === label) {
          a += cosineDistance(point, embeddings[j]);
          aCount++;
        }
      }
      a = aCount ? a / aCount : 0;
  
      // b(i): min avg distance to other clusters
      let b = Infinity;
      for (const other of unique) {
        if (other === label) continue;
  
        let d = 0;
        let count = 0;
        for (let j = 0; j < embeddings.length; j++) {
          if (labels[j] === other) {
            d += cosineDistance(point, embeddings[j]);
            count++;
          }
        }
        if (count) b = Math.min(b, d / count);
      }
  
      const s = b === Infinity ? 0 : (b - a) / Math.max(a, b);
      total += s;
    }
  
    return total / embeddings.length;
  }
  
  /**
   * For menu items, silhouette often prefers too many clusters.
   * This version still uses silhouette, but also caps based on n/2 and adds a small penalty for larger k.
   */
  function findOptimalClusters(embeddings, maxClusters = DEFAULT_MAX_CLUSTERS) {
    const n = embeddings?.length || 0;
    if (n <= 1) return 1;
    if (n === 2) return 2;
  
    const upperHard = Math.min(maxClusters, n);
    const upper = Math.min(upperHard, Math.max(2, Math.floor(n / 2))); // avoid silly k for small n
  
    let bestK = 2;
    let bestScore = -Infinity;
  
    for (let k = 2; k <= upper; k++) {
      try {
        const res = kmeans(embeddings, k, {
          initialization: "kmeans++",
          maxIterations: 100,
        });
  
        const sil = calculateSilhouetteScore(embeddings, res.clusters);
  
        // small penalty for bigger k to encourage merging
        const penalty = 0.01 * (k - 2);
        const score = sil - penalty;
  
        if (score > bestScore) {
          bestScore = score;
          bestK = k;
        }
      } catch {
        continue;
      }
    }
  
    return bestK;
  }
  
  function buildClusterIndices(labels, k) {
    const clusters = Array.from({ length: k }, () => []);
    for (let i = 0; i < labels.length; i++) {
      const cid = labels[i];
      if (cid >= 0 && cid < k) clusters[cid].push(i);
    }
    return clusters;
  }
  
  function pickRepresentativeWithinCluster(clusterIndices, centroid, embeddings, items) {
    if (!clusterIndices?.length) return "";
  
    let bestIdx = clusterIndices[0];
    let bestDist = Infinity;
  
    for (const idx of clusterIndices) {
      const d = cosineDistance(embeddings[idx], centroid);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    }
  
    return items[bestIdx] || "";
  }
  
  /**
   * Second-pass merge: if two cluster representatives are very similar, merge clusters.
   * This is what makes it behave closer to your Python result.
   */
  function mergeClustersByRepSimilarity(clusters) {
    // clusters: [{ rep, rep_embedding, indices }]
    // union-find
    console.log('clusters', clusters);  
    const parent = clusters.map((_, i) => i);
  
    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
  
    function union(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }
  
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = cosineSimilarity(clusters[i].rep_embedding, clusters[j].rep_embedding);
  
        // also require that their normalized keys are not wildly different (guardrail)
        const keyA = normalizeForKey(clusters[i].rep);
        const keyB = normalizeForKey(clusters[j].rep);
  
        const passesKeyGuard =
          keyA === keyB ||
          keyA.includes(keyB) ||
          keyB.includes(keyA) ||
          sim >= (MERGE_SIMILARITY_THRESHOLD + 0.03); // allow high semantic sim even if keys differ
  
        if (sim >= MERGE_SIMILARITY_THRESHOLD && passesKeyGuard) {
          union(i, j);
        }
      }
    }
  
    // gather merged
    const merged = new Map();
    for (let i = 0; i < clusters.length; i++) {
      const r = find(i);
      if (!merged.has(r)) {
        merged.set(r, { reps: [], indices: [] });
      }
      merged.get(r).reps.push(clusters[i].rep);
      merged.get(r).indices.push(...clusters[i].indices);
    }
  
    return Array.from(merged.values());
  }
  
  async function processIntoMenuItems(processedReviews) {
    if (!Array.isArray(processedReviews) || processedReviews.length === 0) {
      return [];
    }
  
    const rows = processedReviews
      .map((r) => ({
        item_raw: String(r?.item || "").trim(),
        item_key: normalizeForKey(r?.item),
        rating: Number(r?.rating),
      }))
      .filter((r) => r.item_key && Number.isFinite(r.rating));
  
    if (rows.length === 0) {
      return [{ category: "Menu Items", items: [] }];
    }
  
    const itemsRaw = rows.map((r) => r.item_raw);
    console.log('itemsRaw', itemsRaw);  
    const embeddings = await getEmbeddings(itemsRaw);
  
    if (embeddings.length !== rows.length) {
      throw new Error("Embedding count mismatch with input rows.");
    }
  
    const k = findOptimalClusters(embeddings);
    const km = kmeans(embeddings, k, {
      initialization: "kmeans++",
      maxIterations: 100,
    });
  
    const clusterToIndices = buildClusterIndices(km.clusters, k);
  
    // build cluster objects with reps
    const clusterObjs = [];
    for (let clusterId = 0; clusterId < k; clusterId++) {
      const indices = clusterToIndices[clusterId];
      if (!indices.length) continue;
  
      const rep = pickRepresentativeWithinCluster(
        indices,
        km.centroids[clusterId],
        embeddings,
        itemsRaw
      );
  
      // embed reps by reusing an existing embedding from within the cluster if possible
      // (rep is selected from itemsRaw, so there is at least one matching index)
      const repIdx = indices.find((i) => itemsRaw[i] === rep) ?? indices[0];
      const repEmbedding = embeddings[repIdx];
  
      clusterObjs.push({ rep, rep_embedding: repEmbedding, indices });
    }
  
    // second pass merge
    const mergedClusters = mergeClustersByRepSimilarity(clusterObjs);
  
    // aggregate ratings for merged clusters
    const out = mergedClusters.map((c) => {
      const ratings = c.indices.map((i) => rows[i].rating);
      const avg = ratings.reduce((s, v) => s + v, 0) / ratings.length;
  
      // choose a stable display name:
      // prefer the shortest rep among merged reps (often most “general”), else first
      const rep = c.reps
        .slice()
        .sort((a, b) => a.length - b.length)[0];
  
      return {
        item: titleCase(rep),
        rating: Math.round(avg * 10) / 10,
        num_reviews: ratings.length,
      };
    });
  
    out.sort((a, b) => b.rating - a.rating);
  
    return [{ category: "Items", items: out }];
  }
  
  module.exports = {
    processIntoMenuItems,
    getEmbeddings,
    findOptimalClusters,
  };