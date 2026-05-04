import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { C_FG, C_DIM, C_GREEN, C_RED, CARD_STYLE } from "@/lib/analysisConstants";
import { useVolumeChart, formatVolume } from "@/hooks/analysis/useVolumeData";
import { BarChart2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

interface VolumeChartProps {
  asset: "bitcoin" | "ethereum";
  title: string;
  color: string;
}

export function VolumeChart({ asset, title, color }: VolumeChartProps) {
  const [days, setDays] = useState(30);
  const { data, loading, currentVolume, change24h } = useVolumeChart(asset, days);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 min-w-0"
      style={{ ...CARD_STYLE, minHeight: "500px" }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color} / 0.12`, color }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{title}</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Spot Volume — All Exchanges (CoinGecko)</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && data.length > 0 && (
            <div className="flex items-center gap-2 mr-3">
              <span className="text-sm font-mono font-bold" style={{ color: C_FG }}>
                {formatVolume(currentVolume)}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: change24h >= 0 ? `${C_GREEN} / 0.15` : `${C_RED} / 0.15`,
                  color: change24h >= 0 ? C_GREEN : C_RED,
                }}
              >
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(1)}%
              </span>
            </div>
          )}
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
                style={{
                  background: days === d ? `${color} / 0.25` : "oklch(1 0 0 / 0.05)",
                  color: days === d ? color : C_DIM,
                }}
              >
                {d === 7 ? "7D" : d === 30 ? "30D" : "90D"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[420px] w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : data.length === 0 ? (
        <div className="h-[420px] flex items-center justify-center text-xs" style={{ color: C_DIM }}>
          Failed to load volume data
        </div>
      ) : (
        <div className="flex-1 min-h-0" style={{ height: "420px" }}>
          <ChartContainer
            config={{
              volume: { label: "Volume", color },
              price: { label: "Price", color: "oklch(0.910 0.015 240)" },
            }}
            className="h-full w-full"
          >
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: C_DIM }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="volume"
                orientation="left"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: C_DIM }}
                tickFormatter={(v) => formatVolume(v as number)}
                domain={[0, "auto"]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatDate(label as string)}
                    formatter={(value, name) => {
                      if (name === "volume") return [formatVolume(value as number), "Volume"];
                      return [`$${(value as number).toLocaleString()}`, "Price"];
                    }}
                  />
                }
              />
              <Bar yAxisId="volume" dataKey="volume" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.volume >= 0 ? color : C_RED}
                    fillOpacity={0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}
