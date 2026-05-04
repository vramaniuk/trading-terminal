import { useCallback, useEffect, useRef, useState } from "react";

interface OnChainData {
  mempoolCount: number | null;
  mempoolVsizeMB: number | null;
  netflowVol: number | null;
  activeAddresses: number | null;
  txCount24h: number | null;
  hashRateEH: number | null;
  circulatingSupplyBTC: number | null;
  loading: boolean;
}

interface BlockchainStatsResponse {
  hashrate?: number;
  difficulty?: number;
  totalbc?: number;
  n_transactions?: number;
  n_unique_addresses?: number;
  market_price_usd?: number;
  estimated_transaction_volume_usd?: number;
  miners_revenue_usd?: number;
  minutes_between_blocks?: number;
  supplyPct?: number;
  timestamp?: string;
}

async function fetchBlockchainStats(): Promise<Partial<OnChainData>> {
  const results: Partial<OnChainData> = {};
  const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";

  try {
    const res = await window.fetch(`${BACKEND_API}/api/analysis/blockchain-stats`);
    if (res.ok) {
      const json = (await res.json()) as BlockchainStatsResponse;

      if (json.n_unique_addresses != null && Number.isFinite(json.n_unique_addresses)) {
        results.activeAddresses = json.n_unique_addresses;
      }
      if (json.n_transactions != null && Number.isFinite(json.n_transactions)) {
        results.txCount24h = json.n_transactions;
      }
      if (json.hashrate != null && Number.isFinite(json.hashrate)) {
        results.hashRateEH = json.hashrate;
      }
      if (json.totalbc != null && Number.isFinite(json.totalbc)) {
        results.circulatingSupplyBTC = json.totalbc / 1e8;
      }
      if (json.estimated_transaction_volume_usd != null && Number.isFinite(json.estimated_transaction_volume_usd)) {
        results.netflowVol = json.estimated_transaction_volume_usd;
      }
    }
  } catch {
    /* ignore */
  }

  return results;
}

export function useOnChainData(): OnChainData {
  const [state, setState] = useState<OnChainData>({
    mempoolCount: null,
    mempoolVsizeMB: null,
    netflowVol: null,
    activeAddresses: null,
    txCount24h: null,
    hashRateEH: null,
    circulatingSupplyBTC: null,
    loading: true,
  });
  const mountedRef = useRef(true);
  const mempoolTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMempool = useCallback(async () => {
    const results: Partial<OnChainData> = {};
    try {
      const res = await window.fetch("https://mempool.space/api/mempool");
      if (res.ok) {
        const json = (await res.json()) as { count: number; vsize: number };
        results.mempoolCount = json.count;
        results.mempoolVsizeMB = json.vsize / 1_000_000;
      }
    } catch {
      /* ignore */
    }
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...results, loading: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const results = await fetchBlockchainStats();
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...results }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchMempool();
    fetchStats();
    mempoolTimerRef.current = setInterval(fetchMempool, 5 * 60_000);
    statsTimerRef.current = setInterval(fetchStats, 10 * 60_000);
    return () => {
      mountedRef.current = false;
      if (mempoolTimerRef.current) clearInterval(mempoolTimerRef.current);
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [fetchMempool, fetchStats]);

  return state;
}
