import { useCallback, useEffect, useState } from "react";

export interface VolumeDataPoint {
  date: string;
  volume: number;
  price: number | null;
}

export function useVolumeChart(asset: "bitcoin" | "ethereum", days: number) {
  const [data, setData] = useState<VolumeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(`${BACKEND_API}/api/analysis/volume-chart/${asset}?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      setData(result.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [asset, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentVolume = data.length > 0 ? data[data.length - 1].volume : 0;
  const prevVolume = data.length > 1 ? data[data.length - 2].volume : currentVolume;
  const change24h = prevVolume ? ((currentVolume - prevVolume) / prevVolume) * 100 : 0;

  return { data, loading, currentVolume, change24h };
}

export function formatVolume(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}
