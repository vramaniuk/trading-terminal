import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Bitcoin,
  DollarSign,
  Hash,
  Layers,
  Lock,
  Pickaxe,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

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

// ---- Glassnode-gated unavailable card ----
function GlassnodeUnavailableCard({
  title,
  subtitle,
  description,
}: {
  title: string;
  subtitle: string;
  description: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 min-w-0 opacity-60"
      style={{
        background: "oklch(0.155 0.020 240)",
        border: "1px solid oklch(1 0 0 / 0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "oklch(0.450 0.015 240 / 0.15)",
              color: C_DIM,
            }}
          >
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: C_MID }}
            >
              {title}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: C_DIM }}
            >
              {subtitle}
            </div>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
          style={{
            background: "oklch(0.450 0.015 240 / 0.15)",
            color: C_DIM,
            border: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          Glassnode Pro
        </span>
      </div>
      <div
        className="font-mono font-bold text-lg mt-0.5"
        style={{ color: C_DIM }}
      >
        Unavailable
      </div>
      <div
        className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
        style={{
          background: "oklch(0.155 0.020 240)",
          color: C_DIM,
          border: "1px solid oklch(1 0 0 / 0.06)",
        }}
      >
        🔒 Glassnode Pro required
      </div>
      <p
        className="text-[10px] italic leading-relaxed"
        style={{ color: C_DIM }}
      >
        {description}
      </p>
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

interface BlockchainInfoStats {
  n_unique_addresses?: number;
  n_transactions?: number;
  hashrate?: number;  // in EH/s from backend
  totalbc?: number;   // in satoshis
}

async function fetchBlockchainStats(): Promise<Partial<OnChainData>> {
  const results: Partial<OnChainData> = {};
  const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";

  try {
    const res = await window.fetch(`${BACKEND_API}/api/analysis/blockchain-stats`);
    if (res.ok) {
      const json = (await res.json()) as BlockchainInfoStats;
      const addr = json.n_unique_addresses;
      if (addr != null && Number.isFinite(addr)) results.activeAddresses = addr;
      const txc = json.n_transactions;
      if (txc != null && Number.isFinite(txc)) results.txCount24h = txc;
      // hashrate is already in EH/s from backend
      const hr = json.hashrate;
      if (hr != null && Number.isFinite(hr)) results.hashRateEH = hr;
      // totalbc is in satoshis from blockchain.info, convert to BTC
      const supply = json.totalbc;
      if (supply != null && Number.isFinite(supply))
        results.circulatingSupplyBTC = supply / 1e8;
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

    // Netflow: blockchain.info estimated tx volume
    try {
      const url =
        "/blockchain/charts/estimated-transaction-volume?timespan=1days&format=json&cors=true";
      const res = await window.fetch(url);
      if (res.ok) {
        const json = (await res.json()) as { values: Array<{ y: number }> };
        const last = json.values?.[json.values.length - 1];
        if (last?.y) results.netflowVol = last.y;
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

        {/* ── Glassnode-gated cards ── */}
        {/* Hashrate Chart */}
        <HashrateChart />

        <GlassnodeUnavailableCard
          title="Exchange Flows"
          subtitle="BTC net flow into/out of exchanges"
          description="Exchange inflows = sell pressure. Outflows = accumulation signal. Requires Glassnode API subscription."
        />

        <GlassnodeUnavailableCard
          title="Whale Count"
          subtitle="Addresses holding > 1,000 BTC"
          description="Tracks the number of whale wallets over time — rising count signals distribution, falling count signals accumulation."
        />
      </div>
    </section>
  );
}

// =========================================================
// SECTION 2: DERIVATIVES & MARKET STRUCTURE
// =========================================================

interface DerivativesData {
  longShortRatio: number | null;
  longPct: number | null;
  shortPct: number | null;
  takerBuySellRatio: number | null;
  putCallRatio: number | null;
  btcOiUsd: number | null; // from Bybit + OKX
  btcMktCap: number | null; // from CoinGecko (passed in via prop or fetched)
  loading: boolean;
}

function useDerivativesData(): DerivativesData {
  const [state, setState] = useState<DerivativesData>({
    longShortRatio: null,
    longPct: null,
    shortPct: null,
    takerBuySellRatio: null,
    putCallRatio: null,
    btcOiUsd: null,
    btcMktCap: null,
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

    // BTC Open Interest in USD from CoinMetrics
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await window.fetch(`${BACKEND_API}/api/analysis/open-interest?asset=btc`);
      if (res.ok) {
        const json = await res.json() as {
          latest?: { value_usd?: number };
        };
        const oiVal = json.latest?.value_usd;
        if (Number.isFinite(oiVal) && oiVal > 0) results.btcOiUsd = oiVal;
      }
    } catch {
      /* ignore */
    }

    // BTC Market Cap from CoinGecko for leverage ratio
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const res = await window.fetch(`${BACKEND_API}/api/analysis/coingecko-coin/bitcoin`);
      if (res.ok) {
        const json = await res.json() as { market_data?: { market_cap?: { usd?: number } } };
        const cap = json.market_data?.market_cap?.usd;
        if (cap && Number.isFinite(cap)) results.btcMktCap = cap;
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

  // Leverage ratio: OI / market cap
  let leverageCategory: "High" | "Medium" | "Low" | null = null;
  let leveragePct: number | null = null;
  if (d.btcOiUsd != null && d.btcMktCap != null && d.btcMktCap > 0) {
    leveragePct = (d.btcOiUsd / d.btcMktCap) * 100;
    if (leveragePct > 3) leverageCategory = "High";
    else if (leveragePct > 1) leverageCategory = "Medium";
    else leverageCategory = "Low";
  }

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

  const levSignal = (): { signal: MetricCardProps["signal"]; text: string } => {
    if (leverageCategory === null)
      return { signal: "unavailable", text: "Data unavailable" };
    if (leverageCategory === "High")
      return {
        signal: "warning",
        text: "High leverage — liquidation risk elevated",
      };
    if (leverageCategory === "Medium")
      return { signal: "neutral", text: "Moderate leverage — healthy range" };
    return { signal: "bullish", text: "Low leverage — less liquidation risk" };
  };

  const ls = lsSignal();
  const ts = takerSignal();
  const pc = pcSignal();
  const lev = levSignal();

  return (
    <section data-ocid="analysis.section.derivatives">
      <MetricSectionHeader
        title="Derivatives & Market Structure"
        subtitle="Futures positioning and options sentiment"
        badge="Binance / Deribit"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

        {/* Estimated Leverage Ratio */}
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
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold" style={{ color: C_FG }}>
                Leverage Ratio
              </div>
              <div className="text-[10px] font-mono" style={{ color: C_DIM }}>
                BTC OI / market cap
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
              style={{
                color:
                  leverageCategory === "High"
                    ? C_YELLOW
                    : leverageCategory === "Medium"
                      ? C_FG
                      : leverageCategory === "Low"
                        ? C_GREEN
                        : C_DIM,
              }}
            >
              {leverageCategory ?? "Unavailable"}
            </div>
          )}
          {!d.loading && leveragePct !== null && (
            <div className="text-[11px] font-mono" style={{ color: C_MID }}>
              {leveragePct.toFixed(2)}% OI-to-cap
            </div>
          )}
          {!d.loading && (
            <div
              className="text-[11px] font-semibold px-2 py-1 rounded-lg w-fit"
              style={{
                background:
                  leverageCategory === "High"
                    ? "oklch(0.820 0.160 90 / 0.10)"
                    : leverageCategory === "Low"
                      ? "oklch(0.723 0.185 150 / 0.10)"
                      : "oklch(0.155 0.020 240)",
                color:
                  leverageCategory === "High"
                    ? C_YELLOW
                    : leverageCategory === "Low"
                      ? C_GREEN
                      : C_DIM,
              }}
            >
              {lev.text}
            </div>
          )}
          <div className="text-[10px] italic" style={{ color: C_DIM }}>
            {"OI >3% mkt cap = High. 1–3% = Medium. <1% = Low risk."}
          </div>
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
