import time
import sys
import numpy as np
import os
from faiss_index import FaissTextIndexer

def dcg_at_k(relevances, k):
    """Discounted Cumulative Gain at k"""
    relevances = np.array(relevances[:k])
    if relevances.size == 0:
        return 0.0
    discounts = np.log2(np.arange(2, relevances.size + 2))
    return np.sum(relevances / discounts)

def ndcg_at_k(relevances, k):
    """Normalized Discounted Cumulative Gain at k"""
    dcg = dcg_at_k(relevances, k)
    ideal_relevances = sorted(relevances, reverse=True)
    idcg = dcg_at_k(ideal_relevances, k)
    return dcg / idcg if idcg > 0 else 0.0

def benchmark():
    print("=" * 70, flush=True)
    print("           FAISS INDEX - ML PERFORMANCE METRICS", flush=True)
    print("=" * 70, flush=True)
    
    # 1. Load Model & Index
    print("\n[1/6] Loading Model & Index...", flush=True)
    start_load = time.time()
    indexer = FaissTextIndexer()
    load_time = time.time() - start_load
    print(f"      Load Time: {load_time:.2f} seconds", flush=True)
    
    if indexer.index is None or indexer.index.ntotal == 0:
        print("ERROR: Index is empty. Cannot benchmark.", flush=True)
        return
    
    n_vectors = indexer.index.ntotal
    dim = 384
    
    # 2. Index Stats
    print(f"\n[2/6] Index Statistics:", flush=True)
    print(f"      Total Vectors:    {n_vectors:,}", flush=True)
    print(f"      Vector Dimension: {dim}", flush=True)
    print(f"      Index Type:       IndexFlatIP (Exact Search)", flush=True)
    print(f"      Embedding Model:  all-MiniLM-L6-v2", flush=True)
    
    # 3. Warmup
    print(f"\n[3/6] Warming up...", flush=True)
    for _ in range(3):
        indexer.search("warmup", k=10)
    
    # 4. Define test queries with expected relevant categories/keywords
    # (category, query, expected_keywords_in_results)
    test_cases = [
        ("laptop", ["laptop", "computer", "notebook"]),
        ("running shoes", ["shoes", "running", "athletic", "sneaker"]),
        ("wireless headphones", ["headphones", "wireless", "audio", "earbuds"]),
        ("kitchen knife", ["knife", "kitchen", "cutlery", "blade"]),
        ("smartphone case", ["phone", "case", "smartphone", "cover"]),
        ("gaming mouse", ["mouse", "gaming", "computer"]),
        ("office chair", ["chair", "office", "seat", "furniture"]),
        ("water bottle", ["bottle", "water", "drink"]),
        ("yoga mat", ["yoga", "mat", "fitness", "exercise"]),
        ("coffee maker", ["coffee", "maker", "machine"]),
    ]
    
    print(f"\n[4/6] Running ML Metrics Evaluation ({len(test_cases)} queries)...", flush=True)
    
    k_values = [1, 3, 5, 10]
    
    # Store metrics per query
    all_precisions = {k: [] for k in k_values}
    all_recalls = {k: [] for k in k_values}
    all_ndcgs = {k: [] for k in k_values}
    mrr_scores = []
    latencies = []
    hit_at_k = {k: 0 for k in k_values}
    
    for query, expected_keywords in test_cases:
        start = time.time()
        results = indexer.search(query, k=max(k_values))
        latencies.append((time.time() - start) * 1000)
        
        # Binary relevance: 1 if any expected keyword is in title/description
        relevances = []
        first_hit_rank = None
        
        for i, r in enumerate(results):
            title = (r.get("title") or "").lower()
            desc = (r.get("description") or "").lower()
            text = title + " " + desc
            
            is_relevant = any(kw.lower() in text for kw in expected_keywords)
            relevances.append(1 if is_relevant else 0)
            
            if is_relevant and first_hit_rank is None:
                first_hit_rank = i + 1
        
        # MRR (Mean Reciprocal Rank)
        if first_hit_rank:
            mrr_scores.append(1.0 / first_hit_rank)
        else:
            mrr_scores.append(0.0)
        
        # Precision, Recall, NDCG at different k
        total_relevant = sum(relevances)
        
        for k in k_values:
            top_k_relevances = relevances[:k]
            relevant_in_k = sum(top_k_relevances)
            
            # Precision@k
            precision = relevant_in_k / k
            all_precisions[k].append(precision)
            
            # Recall@k (using total relevant in top-10 as ground truth)
            recall = relevant_in_k / total_relevant if total_relevant > 0 else 0
            all_recalls[k].append(recall)
            
            # NDCG@k
            ndcg = ndcg_at_k(relevances, k)
            all_ndcgs[k].append(ndcg)
            
            # Hit@k
            if relevant_in_k > 0:
                hit_at_k[k] += 1
    
    # 5. Print ML Metrics
    print(f"\n[5/6] ML EVALUATION METRICS:", flush=True)
    print("-" * 70, flush=True)
    
    print(f"\n      {'Metric':<20} {'@1':>10} {'@3':>10} {'@5':>10} {'@10':>10}", flush=True)
    print(f"      {'-'*20} {'-'*10} {'-'*10} {'-'*10} {'-'*10}", flush=True)
    
    # Precision
    p_row = "      Precision".ljust(26)
    for k in k_values:
        p_row += f"{np.mean(all_precisions[k]):.4f}".rjust(10)
    print(p_row, flush=True)
    
    # Recall
    r_row = "      Recall".ljust(26)
    for k in k_values:
        r_row += f"{np.mean(all_recalls[k]):.4f}".rjust(10)
    print(r_row, flush=True)
    
    # NDCG
    n_row = "      NDCG".ljust(26)
    for k in k_values:
        n_row += f"{np.mean(all_ndcgs[k]):.4f}".rjust(10)
    print(n_row, flush=True)
    
    # Hit Rate
    h_row = "      Hit Rate".ljust(26)
    for k in k_values:
        h_row += f"{hit_at_k[k] / len(test_cases):.4f}".rjust(10)
    print(h_row, flush=True)
    
    # MRR
    print(f"\n      MRR (Mean Reciprocal Rank): {np.mean(mrr_scores):.4f}", flush=True)
    
    # 6. Latency Metrics
    print(f"\n[6/6] LATENCY METRICS:", flush=True)
    print("-" * 70, flush=True)
    avg_lat = np.mean(latencies)
    print(f"      Average Latency:  {avg_lat:.4f} ms", flush=True)
    print(f"      P50 (Median):     {np.percentile(latencies, 50):.4f} ms", flush=True)
    print(f"      P95:              {np.percentile(latencies, 95):.4f} ms", flush=True)
    print(f"      P99:              {np.percentile(latencies, 99):.4f} ms", flush=True)
    print(f"      Min:              {np.min(latencies):.4f} ms", flush=True)
    print(f"      Max:              {np.max(latencies):.4f} ms", flush=True)
    print(f"      Throughput:       {1000/avg_lat:.2f} QPS (sequential)", flush=True)
    
    # Summary
    print("\n" + "=" * 70, flush=True)
    print("           SUMMARY", flush=True)
    print("=" * 70, flush=True)
    print(f"      Index Size:       {n_vectors:,} vectors", flush=True)
    print(f"      Precision@10:     {np.mean(all_precisions[10]):.2%}", flush=True)
    print(f"      Recall@10:        {np.mean(all_recalls[10]):.2%}", flush=True)
    print(f"      NDCG@10:          {np.mean(all_ndcgs[10]):.4f}", flush=True)
    print(f"      MRR:              {np.mean(mrr_scores):.4f}", flush=True)
    print(f"      Avg Latency:      {avg_lat:.2f} ms", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    benchmark()
