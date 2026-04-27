import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  FlaskConical,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllTrades,
  useGetTradingStats,
  useSeedSampleTrades,
} from "../hooks/useQueries";

function fmt(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function KpiCard({
  label,
  value,
  subLabel,
  signal,
}: {
  label: string;
  value: string;
  subLabel?: string;
  signal?: "positive" | "negative" | "neutral";
}) {
  const valueColor =
    signal === "positive"
      ? "oklch(0.723 0.185 150)"
      : signal === "negative"
        ? "oklch(0.637 0.220 25)"
        : "oklch(0.910 0.015 240)";

  return (
    <div
      className="px-4 py-3.5 rounded-xl"
      style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.07)",
      }}
    >
      <div
        className="text-[11px] uppercase tracking-wider font-medium mb-1.5"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        {label}
      </div>
      <div
        className="text-xl font-bold font-mono"
        style={{ color: valueColor }}
      >
        {value}
      </div>
      {subLabel && (
        <div
          className="text-[11px] mt-0.5"
          style={{ color: "oklch(0.450 0.012 240)" }}
        >
          {subLabel}
        </div>
      )}
    </div>
  );
}

function WinRateBar({
  rate,
  wins,
  losses,
}: { rate: number; wins: number; losses: number }) {
  const signal =
    rate >= 55
      ? "oklch(0.723 0.185 150)"
      : rate >= 45
        ? "oklch(0.800 0.180 50)"
        : "oklch(0.637 0.220 25)";
  return (
    <div
      className="px-6 py-5 rounded-xl"
      style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.07)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[11px] uppercase tracking-wider font-medium"
          style={{ color: "oklch(0.500 0.015 240)" }}
        >
          Win Rate
        </span>
        <span
          className="text-2xl font-bold font-mono"
          style={{ color: signal }}
        >
          {rate.toFixed(1)}%
        </span>
      </div>
      {/* Segmented bar */}
      <div
        className="h-2.5 rounded-full overflow-hidden"
        style={{ background: "oklch(1 0 0 / 0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(rate, 100)}%`,
            background: `linear-gradient(90deg, ${signal}, ${signal}cc)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "oklch(0.723 0.185 150)" }}
          />
          <span
            className="text-xs font-semibold"
            style={{ color: "oklch(0.723 0.185 150)" }}
          >
            {wins} wins
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold"
            style={{ color: "oklch(0.637 0.220 25)" }}
          >
            {losses} losses
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "oklch(0.637 0.220 25)" }}
          />
        </div>
      </div>
    </div>
  );
}

function ExcursionCard({
  avgMfe,
  avgMae,
}: {
  avgMfe: number;
  avgMae: number;
}) {
  return (
    <div
      className="px-6 py-5 rounded-xl"
      style={{
        background: "oklch(1 0 0 / 0.03)",
        border: "1px solid oklch(1 0 0 / 0.07)",
      }}
    >
      <div
        className="text-[11px] uppercase tracking-wider font-medium mb-4"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        Excursion Analysis
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Target
              className="w-4 h-4"
              style={{ color: "oklch(0.723 0.185 150)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.723 0.185 150)" }}
            >
              Avg MFE
            </span>
          </div>
          <div
            className="text-3xl font-bold font-mono"
            style={{ color: "oklch(0.723 0.185 150)" }}
          >
            {fmtPct(avgMfe)}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: "oklch(0.400 0.012 240)" }}
          >
            Max Favorable Excursion
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Activity
              className="w-4 h-4"
              style={{ color: "oklch(0.637 0.220 25)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "oklch(0.637 0.220 25)" }}
            >
              Avg MAE
            </span>
          </div>
          <div
            className="text-3xl font-bold font-mono"
            style={{ color: "oklch(0.637 0.220 25)" }}
          >
            {fmtPct(avgMae)}
          </div>
          <div
            className="text-xs mt-1"
            style={{ color: "oklch(0.400 0.012 240)" }}
          >
            Max Adverse Excursion
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full stats panel ────────────────────────────────────────────────────────────
export function TradingStatsPanel() {
  const { data: stats, isLoading } = useGetTradingStats();
  const { data: trades = [], isLoading: tradesLoading } = useGetAllTrades();
  const seedMutation = useSeedSampleTrades();

  const totalPnl = stats?.totalPnl ?? 0;
  const isPositive = totalPnl >= 0;
  const winRate = stats?.winRate ?? 0;
  const winCount = Number(stats?.winCount ?? 0);
  const lossCount = Number(stats?.lossCount ?? 0);
  const tradeCount = Number(stats?.tradeCount ?? 0);

  // Seeding: show if no trades and not loading
  const showSeedButton = !tradesLoading && trades.length === 0;

  return (
    <div
      className="rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.3), 0 1px 0 oklch(1 0 0 / 0.04) inset",
      }}
    >
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between px-5 sm:px-6 py-4 sm:py-5 gap-3"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <BarChart3
            className="w-5 h-5"
            style={{ color: "oklch(0.785 0.135 200)" }}
          />
          <h1
            className="text-lg font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Trading Statistics
          </h1>
        </div>
        {showSeedButton && (
          <Button
            size="sm"
            disabled={seedMutation.isPending}
            data-ocid="trading.seed_button"
            onClick={() =>
              seedMutation.mutate(undefined, {
                onSuccess: () => toast.success("Sample trades loaded."),
                onError: () => toast.error("Failed to seed trades."),
              })
            }
            className="flex items-center gap-1.5 text-xs font-semibold h-8 px-3 w-fit transition-all duration-200"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              border: "1px solid oklch(0.785 0.135 200 / 0.3)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {seedMutation.isPending ? "Loading..." : "Load Sample Trades"}
          </Button>
        )}
      </div>

      <div className="px-4 sm:px-6 py-5 sm:py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {["s1", "s2", "s3", "s4", "s5", "s6"].map((k) => (
              <Skeleton
                key={k}
                className="h-20 w-full rounded-xl"
                style={{ background: "oklch(1 0 0 / 0.05)" }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero Total P/L */}
            <div
              className="px-6 py-5 rounded-xl"
              style={{
                background: isPositive
                  ? "oklch(0.723 0.185 150 / 0.08)"
                  : "oklch(0.637 0.220 25 / 0.08)",
                border: `1px solid ${isPositive ? "oklch(0.723 0.185 150 / 0.22)" : "oklch(0.637 0.220 25 / 0.22)"}`,
              }}
            >
              <div
                className="text-[11px] uppercase tracking-wider font-medium mb-1.5"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Total P&L
              </div>
              <div
                className="text-5xl font-bold font-mono"
                style={{
                  color: isPositive
                    ? "oklch(0.723 0.185 150)"
                    : "oklch(0.637 0.220 25)",
                }}
                data-ocid="stats.total_pnl"
              >
                {fmt(totalPnl)}
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {isPositive ? (
                  <TrendingUp
                    className="w-4 h-4"
                    style={{ color: "oklch(0.723 0.185 150)" }}
                  />
                ) : (
                  <TrendingDown
                    className="w-4 h-4"
                    style={{ color: "oklch(0.637 0.220 25)" }}
                  />
                )}
                <span
                  className="text-sm"
                  style={{
                    color: isPositive
                      ? "oklch(0.600 0.120 150)"
                      : "oklch(0.600 0.120 25)",
                  }}
                >
                  All-time performance · {tradeCount}{" "}
                  {tradeCount === 1 ? "trade" : "trades"} total
                </span>
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <KpiCard
                label="Net Profit"
                value={fmt(stats?.netProfit ?? 0)}
                signal={(stats?.netProfit ?? 0) >= 0 ? "positive" : "negative"}
                subLabel="after fees"
              />
              <KpiCard
                label="Avg Trade P/L"
                value={fmt(stats?.avgTradePnl ?? 0)}
                signal={
                  (stats?.avgTradePnl ?? 0) >= 0 ? "positive" : "negative"
                }
                subLabel="per trade"
              />
              <KpiCard
                label="Total Trades"
                value={String(tradeCount)}
                subLabel={`${winCount}W / ${lossCount}L`}
              />
              <KpiCard
                label="Win Count"
                value={String(winCount)}
                signal="positive"
                subLabel={`${lossCount} losses`}
              />
            </div>

            {/* Win Rate + Excursion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WinRateBar rate={winRate} wins={winCount} losses={lossCount} />
              <ExcursionCard
                avgMfe={stats?.avgMfe ?? 0}
                avgMae={stats?.avgMae ?? 0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
