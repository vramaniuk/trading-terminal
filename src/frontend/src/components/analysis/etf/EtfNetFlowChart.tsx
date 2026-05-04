import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { C_FG, C_DIM, C_CYAN, C_GREEN, C_RED, CARD_STYLE } from "@/lib/analysisConstants";
import { useEtfFlows, formatFlow, type EtfFlowPoint } from "@/hooks/analysis/useEtfFlows";
import { BarChart2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

interface EtfNetFlowChartProps {
  asset: "btc" | "eth";
  title: string;
  accent: string;
}

export function EtfNetFlowChart({ asset, title, accent }: EtfNetFlowChartProps) {
  const [days, setDays] = useState(90);
  const { rows, source, sourceDetail, loading } = useEtfFlows(asset, days);

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00Z`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const lastFlow = rows.length > 0 ? rows[rows.length - 1].netFlowUsd : null;
  const badgeLabel = source === "bitbo" ? "Bitbo" : "—";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 min-w-0"
      style={{ ...CARD_STYLE, minHeight: "420px" }}
      data-ocid={`analysis.etf_flows.${asset}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${accent} / 0.12`, color: accent }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>{title}</div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>Daily net flow · US spot ETFs</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: C_CYAN,
              border: "1px solid oklch(0.785 0.135 200 / 0.20)",
            }}
          >
            {badgeLabel}
          </span>
          {!loading && lastFlow != null && (
            <span className="text-sm font-mono font-bold" style={{ color: C_FG }}>
              {formatFlow(lastFlow)}
              <span className="text-[10px] font-normal ml-1" style={{ color: C_DIM }}>latest day</span>
            </span>
          )}
          <div className="flex bg-black/20 rounded-lg p-0.5">
            {[30, 90, 180].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className="px-2 py-1 text-[10px] font-medium rounded-md transition-colors"
                style={{
                  background: days === d ? "oklch(0.3 0.02 240)" : "transparent",
                  color: days === d ? C_FG : C_DIM,
                }}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-52 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : rows.length > 0 ? (
        <div className="h-52 min-h-[13rem]">
          <ChartContainer config={{ flow: { label: "Net flow", color: accent } }} className="h-full w-full">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: C_DIM, fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tick={{ fill: C_DIM, fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatFlow(Number(v))}
                width={56}
              />
              <ReferenceLine y={0} stroke="oklch(1 0 0 / 0.12)" />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as EtfFlowPoint;
                  const breakdown = p.byEtf?.length
                    ? [...p.byEtf].sort((a, b) => Math.abs(b.flowUsd) - Math.abs(a.flowUsd)).slice(0, 8)
                    : [];
                  return (
                    <div
                      className="rounded-lg px-3 py-2 text-xs max-w-[280px]"
                      style={{ background: "oklch(0.155 0.020 240)", border: "1px solid oklch(1 0 0 / 0.1)" }}
                    >
                      <div style={{ color: C_DIM }}>{formatDate(p.date)}</div>
                      <div className="font-mono font-semibold" style={{ color: p.netFlowUsd >= 0 ? C_GREEN : C_RED }}>
                        {formatFlow(p.netFlowUsd)}
                      </div>
                      {p.priceUsd != null && Number.isFinite(p.priceUsd) ? (
                        <div className="font-mono text-[10px] mt-0.5" style={{ color: C_DIM }}>
                          Spot ≈ ${p.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </div>
                      ) : null}
                      {breakdown.length > 0 ? (
                        <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)" }}>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: C_DIM }}>By ETF</div>
                          {breakdown.map((row) => (
                            <div key={`${p.date}-${row.ticker}`} className="flex justify-between gap-3 font-mono text-[10px]">
                              <span style={{ color: C_DIM }}>{row.ticker}</span>
                              <span style={{ color: row.flowUsd >= 0 ? C_GREEN : C_RED }}>{formatFlow(row.flowUsd)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Bar dataKey="netFlowUsd" maxBarSize={14} radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {rows.map((entry, index) => (
                  <Cell key={`${entry.date}-${index}`} fill={entry.netFlowUsd >= 0 ? C_GREEN : C_RED} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="h-52 flex flex-col items-center justify-center gap-2 px-4 text-center text-[11px]" style={{ color: C_DIM }}>
          <span>No ETF flow data available.</span>
          {sourceDetail ? <span className="text-[10px] max-w-md leading-relaxed">{sourceDetail}</span> : null}
        </div>
      )}
    </div>
  );
}
