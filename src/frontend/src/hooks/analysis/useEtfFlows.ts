import { useCallback, useEffect, useState } from "react";

export interface EtfTickerFlowRow {
  ticker: string;
  flowUsd: number;
}

export interface EtfFlowPoint {
  date: string;
  netFlowUsd: number;
  priceUsd?: number | null;
  byEtf?: EtfTickerFlowRow[];
}

interface EtfFlowsApiResult {
  asset: string;
  source: string;
  sourceDetail?: string;
  data: EtfFlowPoint[];
}

export function useEtfFlows(asset: "btc" | "eth", days: number) {
  const [rows, setRows] = useState<EtfFlowPoint[]>([]);
  const [source, setSource] = useState<string>("");
  const [sourceDetail, setSourceDetail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(`${BACKEND_API}/api/analysis/etf-daily-flows/${asset}?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = (await res.json()) as EtfFlowsApiResult;
      setRows(Array.isArray(result.data) ? result.data : []);
      setSource(result.source || "");
      setSourceDetail(result.sourceDetail || "");
    } catch {
      setRows([]);
      setSource("");
      setSourceDetail("");
    } finally {
      setLoading(false);
    }
  }, [asset, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { rows, source, sourceDetail, loading };
}

export function formatFlow(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}
