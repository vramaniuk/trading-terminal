import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface CategoryData {
  id: string;
  name: string;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  top3Coins: string[];
}

function formatNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function SectorPerformance() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(`${BACKEND_API}/api/analysis/categories`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = await res.json();
      setCategories(data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          Sector Performance
        </h3>
        <p
          className="text-[10px]"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Top crypto sectors by market cap (24h change)
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-12 w-full rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="h-32 flex items-center justify-center text-xs"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Failed to load data
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => {
            const isPositive = category.marketCapChange24h >= 0;
            const color = isPositive
              ? "oklch(0.723 0.185 150)"
              : "oklch(0.637 0.220 25)";
            const barWidth = Math.min(
              Math.abs(category.marketCapChange24h) * 2,
              100,
            );

            return (
              <div
                key={category.id}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{
                  background: "oklch(1 0 0 / 0.03)",
                  border: "1px solid oklch(1 0 0 / 0.05)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: "oklch(0.870 0.012 240)" }}
                    >
                      {category.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" style={{ color }} />
                      ) : (
                        <TrendingDown className="w-3 h-3" style={{ color }} />
                      )}
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color }}
                      >
                        {formatPercentage(category.marketCapChange24h)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full flex-1"
                      style={{ background: "oklch(1 0 0 / 0.08)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: color,
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-mono whitespace-nowrap"
                      style={{ color: "oklch(0.500 0.015 240)" }}
                    >
                      {formatNumber(category.marketCap)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
