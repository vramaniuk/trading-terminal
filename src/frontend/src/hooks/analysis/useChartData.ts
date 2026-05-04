import { useCallback, useEffect, useState } from "react";

interface HashrateDataPoint {
  date: string;
  value: number;
}

export function useHashrateChart(days: number) {
  const [data, setData] = useState<HashrateDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(`${BACKEND_API}/api/analysis/hashrate-chart?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentHashrate = data.length > 0 ? data[data.length - 1].value : 0;
  const prevHashrate = data.length > 1 ? data[data.length - 2].value : currentHashrate;
  const change24h = prevHashrate ? ((currentHashrate - prevHashrate) / prevHashrate) * 100 : 0;

  return { data, loading, change24h };
}

interface DifficultyDataPoint {
  date: string;
  value: number;
}

export function useDifficultyChart(days: number) {
  const [data, setData] = useState<DifficultyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(`${BACKEND_API}/api/analysis/difficulty-chart?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentDifficulty = data.length > 0 ? data[data.length - 1].value : 0;
  const prevDifficulty = data.length > 1 ? data[data.length - 2].value : currentDifficulty;
  const change24h = prevDifficulty ? ((currentDifficulty - prevDifficulty) / prevDifficulty) * 100 : 0;

  return { data, loading, change24h };
}
