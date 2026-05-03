import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Activity,
  BarChart2,
  Bitcoin,
  DollarSign,
  Hash,
  Layers,
  Pickaxe,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from "recharts";

// ---- Shared card background style ----
const CARD_STYLE: React.CSSProperties = {
  background: "oklch(0.155 0.020 240)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};

// ---- Colors ----
const C_GREEN = "oklch(0.723 0.185 150)";
const C_RED = "oklch(0.637 0.220 25)";
const C_YELLOW = "oklch(0.820 0.160 90)";
const C_CYAN = "oklch(0.785 0.135 200)";
const C_DIM = "oklch(0.450 0.015 240)";
const C_MID = "oklch(0.500 0.015 240)";
const C_FG = "oklch(0.910 0.015 240)";


function fmtBigNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString("en-US")}`;
}

function fmtCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "N/A";
  return n.toLocaleString("en-US");
}

// ---- Reusable metric card ----
interface MetricCardProps {
  label: string;
  sublabel: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral" | "warning" | "unavailable";
  signalText: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  loading?: boolean;
}

function MetricCard({
  label,
  sublabel,
  value,
  signal,
  signalText,
  subtitle,
  icon,
  badge,
  loading = false,
}: MetricCardProps) {
  const signalColor =
    signal === "bullish"
      ? C_GREEN
      : signal === "bearish"
        ? C_RED
        : signal === "warning"
          ? C_YELLOW
          : signal === "unavailable"
            ? C_DIM
            : C_MID;

  const signalBg =
    signal === "bullish"
      ? "oklch(0.723 0.185 150 / 0.10)"
      : signal === "bearish"
        ? "oklch(0.637 0.220 25 / 0.10)"
        : signal === "warning"
          ? "oklch(0.820 0.160 90 / 0.10)"
          : signal === "unavailable"
            ? "oklch(0.155 0.020 240)"
            : "oklch(0.155 0.020 240)";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
      style={CARD_STYLE}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: C_CYAN,
            }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: C_FG }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: C_DIM }}
            >
              {sublabel}
            </div>
          </div>
        </div>
        {badge && (
          <span
            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
            style={{
              background: "oklch(0.785 0.135 200 / 0.10)",
              color: C_CYAN,
              border: "1px solid oklch(0.785 0.135 200 / 0.25)",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton
          className="h-8 w-28 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : (
        <div
          className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
          style={{ color: signal === "unavailable" ? C_DIM : C_FG }}
        >
          {value}
        </div>
      )}

      {subtitle && !loading && (
        <div
          className="text-[11px] font-mono truncate"
          style={{ color: C_MID }}
        >
          {subtitle}
        </div>
      )}

      {!loading && (
        <div
          className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
          style={{ background: signalBg, color: signalColor }}
        >
          {signalText}
        </div>
      )}
    </div>
  );
}

// ---- Section Header (shared pattern) ----
export function MetricSectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex flex-col gap-0.5">
        <h2
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "oklch(0.612 0.020 240)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <span className="text-[10px]" style={{ color: C_DIM }}>
            {subtitle}
          </span>
        )}
      </div>
      {badge && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{
            background: "oklch(0.785 0.135 200 / 0.10)",
            color: C_CYAN,
            border: "1px solid oklch(0.785 0.135 200 / 0.20)",
          }}
        >
          {badge}
        </span>
      )}
      <div
        className="flex-1 h-px"
        style={{ background: "oklch(1 0 0 / 0.07)" }}
      />
    </div>
  );
}

// =========================================================
// SECTION 1: ON-CHAIN DATA
// =========================================================

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
  hashrate?: number;           // in EH/s
  difficulty?: number;
  totalbc?: number;            // in satoshis
  n_transactions?: number;     // 24h tx count
  n_unique_addresses?: number;
  market_price_usd?: number;
  estimated_transaction_volume_usd?: number;
  miners_revenue_usd?: number;
  minutes_between_blocks?: number;
  supplyPct?: number;          // % of 21M
  timestamp?: string;
}

async function fetchBlockchainStats(): Promise<Partial<OnChainData>> {
  const results: Partial<OnChainData> = {};
  const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";

  try {
    const res = await window.fetch(`${BACKEND_API}/api/analysis/blockchain-stats`);
    if (res.ok) {
      const json = (await res.json()) as BlockchainStatsResponse;

      // Active addresses
      if (json.n_unique_addresses != null && Number.isFinite(json.n_unique_addresses)) {
        results.activeAddresses = json.n_unique_addresses;
      }

      // Transaction count (24h)
      if (json.n_transactions != null && Number.isFinite(json.n_transactions)) {
        results.txCount24h = json.n_transactions;
      }

      // Hashrate (already in EH/s from backend)
      if (json.hashrate != null && Number.isFinite(json.hashrate)) {
        results.hashRateEH = json.hashrate;
      }

      // Circulating supply (convert satoshis to BTC)
      if (json.totalbc != null && Number.isFinite(json.totalbc)) {
        results.circulatingSupplyBTC = json.totalbc / 1e8;
      }

      // Netflow volume (estimated transaction volume in USD)
      if (json.estimated_transaction_volume_usd != null && Number.isFinite(json.estimated_transaction_volume_usd)) {
        results.netflowVol = json.estimated_transaction_volume_usd;
      }
    }
  } catch {
    /* ignore */
  }

  return results;
}

function useOnChainData(): OnChainData {
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

    // Mempool
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
    // Fetch both on mount, then on different intervals
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

// ---- Hashrate Chart Component ----
interface HashrateDataPoint {
  date: string;
  value: number;
}

function HashrateChart() {
  const [data, setData] = useState<HashrateDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

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

  const chartConfig = {
    value: {
      label: "Hash Rate",
      color: "oklch(0.723 0.185 150)",
    },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 col-span-full lg:col-span-2"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.785 0.135 200 / 0.12)",
              color: C_CYAN,
            }}
          >
            <Pickaxe className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>
              Bitcoin Hash Rate
            </div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
              Network mining power (EH/s)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && data.length > 0 && (
            <div className="flex items-center gap-2 mr-3">
              <span className="text-sm font-mono font-bold" style={{ color: C_FG }}>
                {currentHashrate.toFixed(2)} EH/s
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: change24h >= 0 ? `${C_GREEN} / 0.15` : `${C_RED} / 0.15`,
                  color: change24h >= 0 ? C_GREEN : C_RED,
                }}
              >
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex gap-1">
            {[7, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
                style={{
                  background: days === d ? "oklch(0.785 0.135 200 / 0.25)" : "oklch(1 0 0 / 0.05)",
                  color: days === d ? C_CYAN : C_DIM,
                }}
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
        <div className="h-48 flex items-center justify-center text-xs" style={{ color: C_DIM }}>
          Failed to load hashrate data
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="hashrateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.723 0.185 150)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.723 0.185 150)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              tickFormatter={(value) => `${value.toFixed(0)}`}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [`${(value as number).toFixed(2)} EH/s`, "Hash Rate"]}
                />
              }
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="oklch(0.723 0.185 150)"
              strokeWidth={2}
              fill="url(#hashrateGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "oklch(0.723 0.185 150)" }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

// ---- Difficulty Chart Component ----
interface DifficultyDataPoint {
  date: string;
  value: number;
}

function DifficultyChart() {
  const [data, setData] = useState<DifficultyDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

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

  const chartConfig = {
    value: {
      label: "Difficulty",
      color: "oklch(0.820 0.160 90)",
    },
  };

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

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 col-span-full lg:col-span-2"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.820 0.160 90 / 0.12)",
              color: C_YELLOW,
            }}
          >
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>
              Bitcoin Network Difficulty
            </div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
              Mining difficulty adjustment
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!loading && data.length > 0 && (
            <div className="flex items-center gap-2 mr-3">
              <span className="text-sm font-mono font-bold" style={{ color: C_FG }}>
                {formatDifficulty(currentDifficulty)}
              </span>
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  background: change24h >= 0 ? `${C_GREEN} / 0.15` : `${C_RED} / 0.15`,
                  color: change24h >= 0 ? C_GREEN : C_RED,
                }}
              >
                {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
              </span>
            </div>
          )}
          <div className="flex gap-1">
            {[7, 30, 90, 180, 365].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2 py-0.5 text-[10px] font-medium rounded transition-colors"
                style={{
                  background: days === d ? "oklch(0.820 0.160 90 / 0.25)" : "oklch(1 0 0 / 0.05)",
                  color: days === d ? C_YELLOW : C_DIM,
                }}
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
        <div className="h-48 flex items-center justify-center text-xs" style={{ color: C_DIM }}>
          Failed to load difficulty data
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="difficultyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.820 0.160 90)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.820 0.160 90)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.450 0.015 240)" }}
              tickFormatter={(value) => formatDifficulty(value)}
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [`${formatDifficulty(value as number)}`, "Difficulty"]}
                />
              }
            />
            <Area
              dataKey="value"
              type="monotone"
              stroke="oklch(0.820 0.160 90)"
              strokeWidth={2}
              fill="url(#difficultyGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "oklch(0.820 0.160 90)" }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function OnChainSection() {
  const d = useOnChainData();

  // Circulating supply % of 21M max
  const supplyPct =
    d.circulatingSupplyBTC != null
      ? (d.circulatingSupplyBTC / 21_000_000) * 100
      : null;

  return (
    <section data-ocid="analysis.section.onchain">
      <MetricSectionHeader
        title="On-Chain Data"
        subtitle="Bitcoin network health metrics"
        badge="blockchain.info · mempool.space"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* ── Live cards ── */}
        <MetricCard
          label="Active Addresses (24h)"
          sublabel="Unique BTC addresses active"
          icon={<Users className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.activeAddresses != null
              ? fmtCount(d.activeAddresses)
              : "Unavailable"
          }
          signal={
            d.activeAddresses == null
              ? "unavailable"
              : d.activeAddresses > 800_000
                ? "bullish"
                : d.activeAddresses > 400_000
                  ? "neutral"
                  : "bearish"
          }
          signalText={
            d.activeAddresses == null
              ? "Data unavailable"
              : d.activeAddresses > 800_000
                ? "High network activity — bullish"
                : d.activeAddresses > 400_000
                  ? "Moderate activity — neutral"
                  : "Low activity — bearish"
          }
          badge="blockchain.info"
        />

        <MetricCard
          label="Transactions (24h)"
          sublabel="On-chain confirmed transactions"
          icon={<Hash className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.txCount24h != null ? fmtCount(d.txCount24h) : "Unavailable"}
          signal={
            d.txCount24h == null
              ? "unavailable"
              : d.txCount24h > 350_000
                ? "bullish"
                : d.txCount24h > 200_000
                  ? "neutral"
                  : "bearish"
          }
          signalText={
            d.txCount24h == null
              ? "Data unavailable"
              : d.txCount24h > 350_000
                ? "High usage — strong demand"
                : d.txCount24h > 200_000
                  ? "Normal usage"
                  : "Low usage — reduced demand"
          }
          badge="blockchain.info"
        />

        <MetricCard
          label="Hash Rate"
          sublabel="BTC mining power (24h avg)"
          icon={<Activity className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.hashRateEH != null
              ? `${d.hashRateEH.toFixed(2)} EH/s`
              : "Unavailable"
          }
          signal={
            d.hashRateEH == null
              ? "unavailable"
              : d.hashRateEH > 650
                ? "bullish"
                : d.hashRateEH > 500
                  ? "neutral"
                  : "bearish"
          }
          signalText={
            d.hashRateEH == null
              ? "Data unavailable"
              : d.hashRateEH > 650
                ? "Rising hash rate — strong miner confidence"
                : d.hashRateEH > 500
                  ? "Stable hash rate — neutral"
                  : "Declining hash rate — miner exit risk"
          }
          badge="blockchain.info"
        />

        <MetricCard
          label="Circulating Supply"
          sublabel="Total BTC mined to date"
          icon={<Bitcoin className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.circulatingSupplyBTC != null
              ? `${(d.circulatingSupplyBTC / 1_000_000).toFixed(4)}M BTC`
              : "Unavailable"
          }
          subtitle={
            supplyPct != null
              ? `${supplyPct.toFixed(2)}% of 21M max supply`
              : undefined
          }
          signal={d.circulatingSupplyBTC == null ? "unavailable" : "neutral"}
          signalText={
            d.circulatingSupplyBTC == null
              ? "Data unavailable"
              : "Informational — fixed 21M cap"
          }
          badge="blockchain.info"
        />

        <MetricCard
          label="Mempool Size"
          sublabel="Pending transaction queue"
          icon={<Layers className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.mempoolCount != null
              ? `${fmtCount(d.mempoolCount)} txs`
              : "Unavailable"
          }
          subtitle={
            d.mempoolVsizeMB != null
              ? `${d.mempoolVsizeMB.toFixed(1)} MB pending`
              : undefined
          }
          signal={
            d.mempoolCount == null
              ? "unavailable"
              : d.mempoolCount > 100_000
                ? "warning"
                : d.mempoolCount > 30_000
                  ? "neutral"
                  : "bullish"
          }
          signalText={
            d.mempoolCount == null
              ? "Data unavailable"
              : d.mempoolCount > 100_000
                ? "High congestion — fees elevated"
                : d.mempoolCount > 30_000
                  ? "Moderate congestion"
                  : "Low congestion — fees normal"
          }
          badge="mempool.space"
        />

        <MetricCard
          label="Estimated TX Volume"
          sublabel="On-chain USD value moved"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={d.netflowVol != null ? fmtBigNum(d.netflowVol) : "Unavailable"}
          signal={
            d.netflowVol == null
              ? "unavailable"
              : d.netflowVol > 5_000_000_000
                ? "bullish"
                : d.netflowVol > 1_000_000_000
                  ? "neutral"
                  : "bearish"
          }
          signalText={
            d.netflowVol == null
              ? "Data unavailable"
              : d.netflowVol > 5_000_000_000
                ? "Large value transfers — high activity"
                : d.netflowVol > 1_000_000_000
                  ? "Normal on-chain flow"
                  : "Low on-chain movement"
          }
          badge="blockchain.info"
        />

        {/* Hashrate Chart */}
        <HashrateChart />

        {/* Difficulty Chart */}
        <DifficultyChart />
      </div>
    </section>
  );
}

// =========================================================
// SECTION 1.5: SPOT VOLUME (CoinGecko Aggregated)
// =========================================================

interface VolumeDataPoint {
  date: string;
  volume: number;
  price: number | null;
}

interface VolumeChartProps {
  asset: "bitcoin" | "ethereum";
  title: string;
  color: string;
}

function VolumeChart({ asset, title, color }: VolumeChartProps) {
  const [data, setData] = useState<VolumeDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatVolume = (n: number): string => {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
        minHeight: "500px",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${color} / 0.12`,
              color,
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>
              {title}
            </div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
              Spot Volume — All Exchanges (CoinGecko)
            </div>
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

          <div className="flex bg-black/20 rounded-lg p-0.5">
            {[7, 30, 90].map((d) => (
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
        <Skeleton className="h-48 w-full rounded-lg" style={{ background: "oklch(1 0 0 / 0.06)" }} />
      ) : data.length > 0 ? (
        <div className="h-48">
          <ChartContainer config={{ volume: { label: "Volume", color } }}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`volGrad-${asset}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: C_DIM, fontSize: 10, fontFamily: "monospace" }}
                axisLine={{ stroke: "oklch(1 0 0 / 0.1)" }}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fill: C_DIM, fontSize: 10, fontFamily: "monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatVolume(v)}
                width={60}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as VolumeDataPoint;
                  return (
                    <div
                      className="rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: "oklch(0.155 0.020 240)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      <div style={{ color: C_DIM }}>{formatDate(p.date)}</div>
                      <div className="font-mono font-semibold" style={{ color }}>
                        {formatVolume(p.volume)}
                      </div>
                      {p.price && (
                        <div className="font-mono text-[10px]" style={{ color: C_MID }}>
                          Price: ${p.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="volume"
                stroke={color}
                strokeWidth={2}
                fill={`url(#volGrad-${asset})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      ) : (
        <div className="h-48 flex items-center justify-center text-[11px]" style={{ color: C_DIM }}>
          No volume data available
        </div>
      )}
    </div>
  );
}

export function VolumeSection() {
  return (
    <section data-ocid="analysis.section.volume" className="mb-8">
      <MetricSectionHeader
        title="Global Spot Volume"
        subtitle="24h trading volume aggregated across all major exchanges"
        badge="CoinGecko"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <VolumeChart asset="bitcoin" title="BTC Volume" color="oklch(0.820 0.160 60)" />
        <VolumeChart asset="ethereum" title="ETH Volume" color="oklch(0.785 0.135 280)" />
      </div>
    </section>
  );
}

// =========================================================
// US spot ETF daily net flows
// =========================================================

interface EtfTickerFlowRow {
  ticker: string;
  flowUsd: number;
}

interface EtfFlowPoint {
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

interface EtfNetFlowChartProps {
  asset: "btc" | "eth";
  title: string;
  accent: string;
}

function EtfNetFlowChart({ asset, title, accent }: EtfNetFlowChartProps) {
  const [rows, setRows] = useState<EtfFlowPoint[]>([]);
  const [source, setSource] = useState<string>("");
  const [sourceDetail, setSourceDetail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await fetch(
        `${BACKEND_API}/api/analysis/etf-daily-flows/${asset}?days=${days}`,
      );
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

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T12:00:00Z`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatFlow = (n: number): string => {
    const abs = Math.abs(n);
    if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  const lastFlow = rows.length > 0 ? rows[rows.length - 1].netFlowUsd : null;
  const badgeLabel = source === "bitbo" ? "Bitbo" : "—";

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 min-w-0"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
        minHeight: "420px",
      }}
      data-ocid={`analysis.etf_flows.${asset}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${accent} / 0.12`,
              color: accent,
            }}
          >
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-semibold" style={{ color: C_FG }}>
              {title}
            </div>
            <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
              Daily net flow · US spot ETFs
            </div>
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
              <span className="text-[10px] font-normal ml-1" style={{ color: C_DIM }}>
                latest day
              </span>
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
                      style={{
                        background: "oklch(0.155 0.020 240)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      <div style={{ color: C_DIM }}>{formatDate(p.date)}</div>
                      <div
                        className="font-mono font-semibold"
                        style={{ color: p.netFlowUsd >= 0 ? C_GREEN : C_RED }}
                      >
                        {formatFlow(p.netFlowUsd)}
                      </div>
                      {p.priceUsd != null && Number.isFinite(p.priceUsd) ? (
                        <div className="font-mono text-[10px] mt-0.5" style={{ color: C_MID }}>
                          Spot ≈ ${p.priceUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </div>
                      ) : null}
                      {breakdown.length > 0 ? (
                        <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: "1px solid oklch(1 0 0 / 0.08)" }}>
                          <div className="text-[10px] uppercase tracking-wide" style={{ color: C_DIM }}>
                            By ETF
                          </div>
                          {breakdown.map((row) => (
                            <div
                              key={`${p.date}-${row.ticker}`}
                              className="flex justify-between gap-3 font-mono text-[10px]"
                            >
                              <span style={{ color: C_MID }}>{row.ticker}</span>
                              <span style={{ color: row.flowUsd >= 0 ? C_GREEN : C_RED }}>
                                {formatFlow(row.flowUsd)}
                              </span>
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
                  <Cell
                    key={`${entry.date}-${index}`}
                    fill={entry.netFlowUsd >= 0 ? C_GREEN : C_RED}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      ) : (
        <div
          className="h-52 flex flex-col items-center justify-center gap-2 px-4 text-center text-[11px]"
          style={{ color: C_DIM }}
        >
          <span>No ETF flow data available.</span>
          {sourceDetail ? (
            <span className="text-[10px] max-w-md leading-relaxed">{sourceDetail}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function EtfFlowsSection() {
  return (
    <section data-ocid="analysis.section.etf_flows" className="mb-8">
      <MetricSectionHeader
        title="US spot ETF — daily net flows"
        subtitle="USD net flow from bitbo.io (BTC) and Finnhub (ETH)"
        badge="Bitbo · Finnhub"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <EtfNetFlowChart asset="btc" title="Bitcoin (BTC) spot ETFs" accent="oklch(0.820 0.160 60)" />
        <EtfNetFlowChart asset="eth" title="Ethereum (ETH) spot ETFs" accent="oklch(0.785 0.135 280)" />
      </div>
    </section>
  );
}

// =========================================================
// SECTION 2: DERIVATIVES & MARKET STRUCTURE
// =========================================================

interface CoinVolumeData {
  name: string;
  symbol: string;
  price: number | null;
  change1h: number | null;
  change24h: number | null;
  change7d: number | null;
  marketCap: number | null;
  volume24h: number | null;
}

interface DerivativesData {
  longShortRatio: number | null;
  longPct: number | null;
  shortPct: number | null;
  takerBuySellRatio: number | null;
  putCallRatio: number | null;
  btcData: CoinVolumeData;
  ethData: CoinVolumeData;
  loading: boolean;
}

function useDerivativesData(): DerivativesData {
  const [state, setState] = useState<DerivativesData>({
    longShortRatio: null,
    longPct: null,
    shortPct: null,
    takerBuySellRatio: null,
    putCallRatio: null,
    btcData: { name: "Bitcoin", symbol: "BTC", price: null, change1h: null, change24h: null, change7d: null, marketCap: null, volume24h: null },
    ethData: { name: "Ethereum", symbol: "ETH", price: null, change1h: null, change24h: null, change7d: null, marketCap: null, volume24h: null },
    loading: true,
  });
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    const results: Partial<DerivativesData> = {};

    // Long/Short Ratio
    try {
      const res = await window.fetch(
        "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1",
      );
      if (res.ok) {
        const json = (await res.json()) as Array<{
          longShortRatio: string;
          longAccount: string;
          shortAccount: string;
        }>;
        if (json[0]) {
          results.longShortRatio = Number.parseFloat(json[0].longShortRatio);
          results.longPct = Number.parseFloat(json[0].longAccount) * 100;
          results.shortPct = Number.parseFloat(json[0].shortAccount) * 100;
        }
      }
    } catch {
      /* ignore */
    }

    // Taker Buy/Sell Ratio (liquidation proxy)
    try {
      const res = await window.fetch(
        "https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=5m&limit=1",
      );
      if (res.ok) {
        const json = (await res.json()) as Array<{ buySellRatio: string }>;
        if (json[0]) {
          results.takerBuySellRatio = Number.parseFloat(json[0].buySellRatio);
        }
      }
    } catch {
      /* ignore */
    }

    // BTC data from CoinGecko
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await window.fetch(`${BACKEND_API}/api/analysis/coingecko-coin/bitcoin`);
      if (res.ok) {
        const json = await res.json() as {
          market_data?: {
            current_price?: { usd?: number };
            market_cap?: { usd?: number };
            total_volume?: { usd?: number };
            price_change_percentage_1h_in_currency?: { usd?: number };
            price_change_percentage_24h_in_currency?: { usd?: number };
            price_change_percentage_7d_in_currency?: { usd?: number };
          };
        };
        const md = json.market_data;
        results.btcData = {
          name: "Bitcoin",
          symbol: "BTC",
          price: md?.current_price?.usd ?? null,
          change1h: md?.price_change_percentage_1h_in_currency?.usd ?? null,
          change24h: md?.price_change_percentage_24h_in_currency?.usd ?? null,
          change7d: md?.price_change_percentage_7d_in_currency?.usd ?? null,
          marketCap: md?.market_cap?.usd ?? null,
          volume24h: md?.total_volume?.usd ?? null,
        };
      }
    } catch {
      /* ignore */
    }

    // ETH data from CoinGecko
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await window.fetch(`${BACKEND_API}/api/analysis/coingecko-coin/ethereum`);
      if (res.ok) {
        const json = await res.json() as {
          market_data?: {
            current_price?: { usd?: number };
            market_cap?: { usd?: number };
            total_volume?: { usd?: number };
            price_change_percentage_1h_in_currency?: { usd?: number };
            price_change_percentage_24h_in_currency?: { usd?: number };
            price_change_percentage_7d_in_currency?: { usd?: number };
          };
        };
        const md = json.market_data;
        results.ethData = {
          name: "Ethereum",
          symbol: "ETH",
          price: md?.current_price?.usd ?? null,
          change1h: md?.price_change_percentage_1h_in_currency?.usd ?? null,
          change24h: md?.price_change_percentage_24h_in_currency?.usd ?? null,
          change7d: md?.price_change_percentage_7d_in_currency?.usd ?? null,
          marketCap: md?.market_cap?.usd ?? null,
          volume24h: md?.total_volume?.usd ?? null,
        };
      }
    } catch {
      /* ignore */
    }

    // Deribit Options Put/Call Ratio
    try {
      const res = await window.fetch(
        "https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option",
      );
      if (res.ok) {
        const json = (await res.json()) as {
          result?: Array<{ instrument_name: string; volume: number }>;
        };
        const instruments = (json.result ?? []).slice(0, 500);
        let putVol = 0;
        let callVol = 0;
        for (const inst of instruments) {
          const vol = inst.volume ?? 0;
          if (!Number.isFinite(vol)) continue;
          // instrument_name format: BTC-DDMMMYY-STRIKE-P or -C
          if (inst.instrument_name.endsWith("-P")) {
            putVol += vol;
          } else if (inst.instrument_name.endsWith("-C")) {
            callVol += vol;
          }
        }
        if (callVol > 0) results.putCallRatio = putVol / callVol;
      }
    } catch {
      /* ignore */
    }

    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...results, loading: false }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    timerRef.current = setInterval(fetch, 60_000);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetch]);

  return state;
}

export function DerivativesSection() {
  const d = useDerivativesData();

  const lsSignal = (): { signal: MetricCardProps["signal"]; text: string } => {
    if (d.longShortRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.longShortRatio > 1.2)
      return { signal: "bearish", text: "Crowded longs — contrarian bearish" };
    if (d.longShortRatio < 0.8)
      return { signal: "bullish", text: "Crowded shorts — contrarian bullish" };
    return { signal: "neutral", text: "Balanced positioning" };
  };

  const takerSignal = (): {
    signal: MetricCardProps["signal"];
    text: string;
  } => {
    if (d.takerBuySellRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.takerBuySellRatio > 1.05)
      return { signal: "bullish", text: "Buyers dominating market orders" };
    if (d.takerBuySellRatio < 0.95)
      return { signal: "bearish", text: "Sellers dominating market orders" };
    return { signal: "neutral", text: "Balanced buy/sell pressure" };
  };

  const pcSignal = (): { signal: MetricCardProps["signal"]; text: string } => {
    if (d.putCallRatio == null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (d.putCallRatio > 1.0)
      return { signal: "bearish", text: "More puts — hedging / fear dominant" };
    if (d.putCallRatio < 0.6)
      return { signal: "bullish", text: "More calls — bullish options flow" };
    return { signal: "neutral", text: "Balanced options positioning" };
  };

  const ls = lsSignal();
  const ts = takerSignal();
  const pc = pcSignal();

  return (
    <section data-ocid="analysis.section.derivatives">
      <MetricSectionHeader
        title="Derivatives & Market Structure"
        subtitle="Futures positioning, options sentiment, and spot volume"
        badge="Binance / Deribit / CoinGecko"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Long/Short Ratio */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.785 0.135 200 / 0.12)",
                color: C_CYAN,
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                Long/Short Ratio
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                BTCUSDT PERP accounts
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-20 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-xl"
              style={{ color: C_FG }}
            >
              {d.longShortRatio != null
                ? d.longShortRatio.toFixed(3)
                : "Unavailable"}
            </div>
          )}
          {!d.loading && d.longPct != null && d.shortPct != null && (
            <div className="flex gap-3 text-[11px] font-mono">
              <span style={{ color: C_GREEN }}>L {d.longPct.toFixed(1)}%</span>
              <span style={{ color: C_RED }}>S {d.shortPct.toFixed(1)}%</span>
            </div>
          )}
          {!d.loading && d.longPct != null && d.shortPct != null && (
            <div
              className="relative h-2 rounded-full overflow-hidden"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{ width: `${d.longPct}%`, background: C_GREEN }}
              />
            </div>
          )}
          {!d.loading && (
            <div
              className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
              style={{
                background:
                  ls.signal === "bullish"
                    ? "oklch(0.723 0.185 150 / 0.10)"
                    : ls.signal === "bearish"
                      ? "oklch(0.637 0.220 25 / 0.10)"
                      : "oklch(0.155 0.020 240)",
                color:
                  ls.signal === "bullish"
                    ? C_GREEN
                    : ls.signal === "bearish"
                      ? C_RED
                      : C_DIM,
              }}
            >
              {ls.text}
            </div>
          )}
          <div className="text-[10px] italic" style={{ color: C_DIM }}>
            {">1.2 = crowded longs (bearish). <0.8 = crowded shorts (bullish)."}
          </div>
        </div>

        {/* Taker Buy/Sell Ratio */}
        <MetricCard
          label="Taker Buy/Sell Ratio"
          sublabel="Market order flow — BTCUSDT"
          icon={<Activity className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.takerBuySellRatio != null
              ? d.takerBuySellRatio.toFixed(3)
              : "Unavailable"
          }
          subtitle={
            d.takerBuySellRatio != null
              ? `${(d.takerBuySellRatio * 100).toFixed(1)}% buy taker ratio`
              : undefined
          }
          signal={ts.signal}
          signalText={ts.text}
          badge="Binance"
        />

        {/* Put/Call Ratio */}
        <MetricCard
          label="Options Put/Call Ratio"
          sublabel="BTC options volume (Deribit)"
          icon={<BarChart2 className="w-3.5 h-3.5" />}
          loading={d.loading}
          value={
            d.putCallRatio != null ? d.putCallRatio.toFixed(3) : "Unavailable"
          }
          subtitle={
            d.putCallRatio != null
              ? `${d.putCallRatio > 1 ? "Puts dominant" : "Calls dominant"}`
              : undefined
          }
          signal={pc.signal}
          signalText={pc.text}
          badge="Deribit"
        />

        {/* BTC Volume Card */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.785 0.135 200 / 0.12)",
                color: C_CYAN,
              }}
            >
              <Bitcoin className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                {d.btcData.name}
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                {d.btcData.symbol}
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-24 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-lg"
              style={{ color: C_FG }}
            >
              {d.btcData.price != null
                ? `$${d.btcData.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Unavailable"}
            </div>
          )}
          {!d.loading && (
            <div className="flex gap-2 text-[10px] font-mono">
              <span style={{ color: (d.btcData.change1h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                1h: {(d.btcData.change1h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.btcData.change24h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                24h: {(d.btcData.change24h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.btcData.change7d ?? 0) >= 0 ? C_GREEN : C_RED }}>
                7d: {(d.btcData.change7d ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
          {!d.loading && d.btcData.marketCap != null && (
            <div className="text-[10px] font-mono" style={{ color: C_MID }}>
              Cap: {fmtBigNum(d.btcData.marketCap)}
            </div>
          )}
          {!d.loading && d.btcData.volume24h != null && (
            <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: "oklch(0.155 0.020 240)", color: C_CYAN }}>
              Vol 24h: {fmtBigNum(d.btcData.volume24h)}
            </div>
          )}
        </div>

        {/* ETH Volume Card */}
        <div
          className="rounded-xl p-4 flex flex-col gap-2 min-w-0"
          style={CARD_STYLE}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "oklch(0.620 0.140 280 / 0.12)",
                color: "oklch(0.720 0.140 280)",
              }}
            >
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                {d.ethData.name}
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                {d.ethData.symbol}
              </div>
            </div>
          </div>
          {d.loading ? (
            <Skeleton
              className="h-8 w-24 rounded"
              style={{ background: "oklch(1 0 0 / 0.06)" }}
            />
          ) : (
            <div
              className="font-mono font-bold text-lg"
              style={{ color: C_FG }}
            >
              {d.ethData.price != null
                ? `$${d.ethData.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Unavailable"}
            </div>
          )}
          {!d.loading && (
            <div className="flex gap-2 text-[10px] font-mono">
              <span style={{ color: (d.ethData.change1h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                1h: {(d.ethData.change1h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.ethData.change24h ?? 0) >= 0 ? C_GREEN : C_RED }}>
                24h: {(d.ethData.change24h ?? 0).toFixed(2)}%
              </span>
              <span style={{ color: (d.ethData.change7d ?? 0) >= 0 ? C_GREEN : C_RED }}>
                7d: {(d.ethData.change7d ?? 0).toFixed(2)}%
              </span>
            </div>
          )}
          {!d.loading && d.ethData.marketCap != null && (
            <div className="text-[10px] font-mono" style={{ color: C_MID }}>
              Cap: {fmtBigNum(d.ethData.marketCap)}
            </div>
          )}
          {!d.loading && d.ethData.volume24h != null && (
            <div className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit" style={{ background: "oklch(0.155 0.020 240)", color: "oklch(0.720 0.140 280)" }}>
              Vol 24h: {fmtBigNum(d.ethData.volume24h)}
            </div>
          )}
        </div>
      </div>

      {/* Derivatives info box */}
      <div
        className="mt-3 rounded-lg p-3 flex gap-2.5"
        style={{
          background: "oklch(0.785 0.135 200 / 0.06)",
          border: "1px solid oklch(0.785 0.135 200 / 0.15)",
        }}
      >
        <TrendingDown
          className="w-3.5 h-3.5 shrink-0 mt-0.5"
          style={{ color: C_CYAN }}
        />
        <p className="text-[11px]" style={{ color: C_MID }}>
          <span className="font-semibold" style={{ color: C_CYAN }}>
            Derivatives signals are contrarian:
          </span>{" "}
          Crowded positions (too many longs or shorts) historically precede
          reversals. Use alongside funding rate and on-chain data for
          confirmation.
        </p>
      </div>
    </section>
  );
}
