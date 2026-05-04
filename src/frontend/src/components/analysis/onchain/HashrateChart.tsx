import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { C_GREEN, C_DIM, C_YELLOW } from "@/lib/analysisConstants";
import { useHashrateChart } from "@/hooks/analysis/useChartData";
import { useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

export function HashrateChart() {
  const [days, setDays] = useState(30);
  const { data, loading, change24h } = useHashrateChart(days);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartConfig = {
    value: { label: "Hash Rate", color: C_GREEN },
  };

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 col-span-full lg:col-span-2" style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.723 0.185 150 / 0.12)", color: C_GREEN }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: "oklch(0.910 0.015 240)" }}>Network Hash Rate</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>30-day average EH/s</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!loading && change24h !== 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: change24h >= 0 ? `${C_GREEN} / 0.15` : "oklch(0.637 0.220 25 / 0.15)", color: change24h >= 0 ? C_GREEN : "oklch(0.637 0.220 25)" }}>
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          )}
          <div className="flex gap-1">
            {[7, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
                style={{ background: days === d ? "oklch(0.723 0.185 150 / 0.25)" : "oklch(1 0 0 / 0.05)", color: days === d ? C_GREEN : C_DIM }}
              >
                {d === 365 ? "1Y" : `${d}D`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs" style={{ color: C_DIM }}>Failed to load hashrate data</div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="hashrateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C_GREEN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C_GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C_DIM }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C_DIM }} tickFormatter={(v) => `${v.toFixed(0)}`} domain={["auto", "auto"]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatDate(label as string)} formatter={(value) => [`${(value as number).toFixed(2)} EH/s`, "Hash Rate"]} />} />
            <Area dataKey="value" type="monotone" stroke={C_GREEN} strokeWidth={2} fill="url(#hashrateGradient)" dot={false} activeDot={{ r: 4, fill: C_GREEN }} />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
