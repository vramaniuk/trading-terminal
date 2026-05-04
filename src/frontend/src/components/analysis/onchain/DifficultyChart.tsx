import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { C_YELLOW, C_DIM } from "@/lib/analysisConstants";
import { useDifficultyChart } from "@/hooks/analysis/useChartData";
import { useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

export function DifficultyChart() {
  const [days, setDays] = useState(30);
  const { data, loading, change24h } = useDifficultyChart(days);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDifficulty = (n: number): string => {
    if (n >= 1e15) return `${(n / 1e15).toFixed(2)}P`;
    if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(2)}G`;
    return n.toFixed(0);
  };

  const chartConfig = {
    value: { label: "Difficulty", color: C_YELLOW },
  };

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3 col-span-full lg:col-span-2" style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "oklch(0.820 0.160 90 / 0.12)", color: C_YELLOW }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: "oklch(0.910 0.015 240)" }}>Mining Difficulty</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Network difficulty adjustment</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!loading && change24h !== 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: change24h >= 0 ? "oklch(0.723 0.185 150 / 0.15)" : "oklch(0.637 0.220 25 / 0.15)", color: change24h >= 0 ? "oklch(0.723 0.185 150)" : "oklch(0.637 0.220 25)" }}>
              {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
            </span>
          )}
          <div className="flex gap-1">
            {[7, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
                style={{ background: days === d ? "oklch(0.820 0.160 90 / 0.25)" : "oklch(1 0 0 / 0.05)", color: days === d ? C_YELLOW : C_DIM }}
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
        <div className="h-48 flex items-center justify-center text-xs" style={{ color: C_DIM }}>Failed to load difficulty data</div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="difficultyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C_YELLOW} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C_YELLOW} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={formatDate} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C_DIM }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C_DIM }} tickFormatter={(value) => formatDifficulty(value as number)} domain={["auto", "auto"]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => formatDate(label as string)} formatter={(value) => [`${formatDifficulty(value as number)}`, "Difficulty"]} />} />
            <Area dataKey="value" type="monotone" stroke={C_YELLOW} strokeWidth={2} fill="url(#difficultyGradient)" dot={false} activeDot={{ r: 4, fill: C_YELLOW }} />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
