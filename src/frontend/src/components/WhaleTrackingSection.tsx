import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Wallet,
  Activity,
  Bitcoin,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CARD_STYLE: React.CSSProperties = {
  background: "oklch(0.155 0.020 240)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};

const C_GREEN = "oklch(0.723 0.185 150)";
const C_RED = "oklch(0.637 0.220 25)";
const C_YELLOW = "oklch(0.820 0.160 90)";
const C_CYAN = "oklch(0.785 0.135 200)";
const C_DIM = "oklch(0.450 0.015 240)";
const C_MID = "oklch(0.500 0.015 240)";
const C_FG = "oklch(0.910 0.015 240)";

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtUsdCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return fmtUsd(n);
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
}

function fmtEth(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ETH`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K ETH`;
  return `${n.toFixed(4)} ETH`;
}

interface BlockchairTransaction {
  hash: string;
  time: string;
  sender: string;
  recipient: string;
  amount: number;
  fee: string;
}

interface EthTransaction {
  hash: string;
  time: string;
  sender: string;
  recipient: string;
  amount: number;
  gasUsed: number;
  gasPrice: number;
}

interface ActiveAddressesState {
  btc: number | null;
  eth: number | null;
  btcChange24h: number | null;
  ethChange24h: number | null;
  loading: boolean;
  error: boolean;
}

interface WhaleWalletState {
  totalWhaleBalance: number;
  whaleCount: number;
  loading: boolean;
  error: boolean;
}

interface LargeTransactionsState {
  transactions: BlockchairTransaction[];
  stats: {
    totalTransactions: number;
    whaleTransactions: number;
    whalePercentage: string;
  } | null;
  loading: boolean;
  error: boolean;
}

interface EthLargeTransactionsState {
  transactions: EthTransaction[];
  stats: {
    totalTransactions: number;
    whaleTransactions: number;
    whalePercentage: string;
  } | null;
  loading: boolean;
  error: boolean;
}

function useLargeTransactions(): LargeTransactionsState {
  const [state, setState] = useState<LargeTransactionsState>({
    transactions: [],
    stats: null,
    loading: true,
    error: false,
  });

  const fetchLargeTransactions = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const res = await fetch(
        `${BACKEND_API}/api/analysis/btc/large-transactions?min_amount=1&limit=10`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({
        transactions: data.data?.transactions || [],
        stats: data.data?.stats || null,
        loading: false,
        error: false,
      });
    } catch {
      setState({
        transactions: [],
        stats: null,
        loading: false,
        error: true,
      });
    }
  }, []);

  useEffect(() => {
    fetchLargeTransactions();
    const interval = setInterval(fetchLargeTransactions, 60000);
    return () => clearInterval(interval);
  }, [fetchLargeTransactions]);

  return state;
}

function useEthLargeTransactions(): EthLargeTransactionsState {
  const [state, setState] = useState<EthLargeTransactionsState>({
    transactions: [],
    stats: null,
    loading: true,
    error: false,
  });

  const fetchEthLargeTransactions = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const res = await fetch(
        `${BACKEND_API}/api/analysis/eth/large-transactions?min_value=1&limit=10`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setState({
        transactions: data.data?.transactions || [],
        stats: data.data?.stats || null,
        loading: false,
        error: false,
      });
    } catch {
      setState({
        transactions: [],
        stats: null,
        loading: false,
        error: true,
      });
    }
  }, []);

  useEffect(() => {
    fetchEthLargeTransactions();
    const interval = setInterval(fetchEthLargeTransactions, 60000);
    return () => clearInterval(interval);
  }, [fetchEthLargeTransactions]);

  return state;
}

function useActiveAddresses(): ActiveAddressesState {
  const [state, setState] = useState<ActiveAddressesState>({
    btc: null,
    eth: null,
    btcChange24h: null,
    ethChange24h: null,
    loading: true,
    error: false,
  });

  const fetchActiveAddresses = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const [btcRes, ethRes] = await Promise.all([
        fetch(
          `${BACKEND_API}/api/analysis/coinmetrics/btc?metrics=active_addresses`
        ),
        fetch(
          `${BACKEND_API}/api/analysis/coinmetrics/eth?metrics=active_addresses`
        ),
      ]);

      if (!btcRes.ok || !ethRes.ok) throw new Error("HTTP error");

      const btcData = await btcRes.json();
      const ethData = await ethRes.json();

      const btcLatest = btcData.data?.[btcData.data?.length - 1];
      const ethLatest = ethData.data?.[ethData.data?.length - 1];
      const btcPrev = btcData.data?.[btcData.data?.length - 2];
      const ethPrev = ethData.data?.[ethData.data?.length - 2];

      const btcChange = btcLatest && btcPrev
        ? ((btcLatest.active_addresses - btcPrev.active_addresses) / btcPrev.active_addresses) * 100
        : null;
      const ethChange = ethLatest && ethPrev
        ? ((ethLatest.active_addresses - ethPrev.active_addresses) / ethPrev.active_addresses) * 100
        : null;

      setState({
        btc: btcLatest?.active_addresses || null,
        eth: ethLatest?.active_addresses || null,
        btcChange24h: btcChange,
        ethChange24h: ethChange,
        loading: false,
        error: false,
      });
    } catch {
      setState({
        btc: null,
        eth: null,
        btcChange24h: null,
        ethChange24h: null,
        loading: false,
        error: true,
      });
    }
  }, []);

  useEffect(() => {
    fetchActiveAddresses();
    const interval = setInterval(fetchActiveAddresses, 300000);
    return () => clearInterval(interval);
  }, [fetchActiveAddresses]);

  return state;
}

function useWhaleWallets(): WhaleWalletState {
  const [state, setState] = useState<WhaleWalletState>({
    totalWhaleBalance: 0,
    whaleCount: 0,
    loading: true,
    error: false,
  });

  const fetchWhaleWallets = useCallback(async () => {
    const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
    try {
      const res = await fetch(
        `${BACKEND_API}/api/analysis/btc/large-transactions?min_amount=10&limit=50`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const transactions = data.data?.transactions || [];
      
      const uniqueAddresses = new Set<string>();
      let totalBalance = 0;

      transactions.forEach((tx: any) => {
        if (tx.sender) uniqueAddresses.add(tx.sender);
        if (tx.recipient) uniqueAddresses.add(tx.recipient);
        totalBalance += tx.amount || 0;
      });

      setState({
        totalWhaleBalance: totalBalance,
        whaleCount: uniqueAddresses.size,
        loading: false,
        error: false,
      });
    } catch {
      setState({
        totalWhaleBalance: 0,
        whaleCount: 0,
        loading: false,
        error: true,
      });
    }
  }, []);

  useEffect(() => {
    fetchWhaleWallets();
    const interval = setInterval(fetchWhaleWallets, 300000);
    return () => clearInterval(interval);
  }, [fetchWhaleWallets]);

  return state;
}

interface MetricCardProps {
  label: string;
  sublabel: string;
  value: string;
  signal: "bullish" | "bearish" | "neutral" | "warning" | "unavailable";
  signalText: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function MetricCard({
  label,
  sublabel,
  value,
  signal,
  signalText,
  icon,
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
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: signalBg }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium" style={{ color: C_DIM }}>
              {label}
            </div>
            <div className="text-xs" style={{ color: C_MID }}>
              {sublabel}
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <div className="text-2xl font-bold" style={{ color: C_FG }}>
          {value}
        </div>
      )}
      <div
        className="text-xs font-medium px-2 py-1 rounded-md inline-block w-fit"
        style={{ color: signalColor, background: signalBg }}
      >
        {signalText}
      </div>
    </div>
  );
}

export function WhaleTrackingSection() {
  const largeTransactions = useLargeTransactions();
  const ethLargeTransactions = useEthLargeTransactions();
  const activeAddresses = useActiveAddresses();
  const whaleWallets = useWhaleWallets();

  const getSignal = (change: number | null): "bullish" | "bearish" | "neutral" | "unavailable" => {
    if (change === null) return "unavailable";
    if (change > 5) return "bullish";
    if (change < -5) return "bearish";
    return "neutral";
  };

  const getSignalText = (change: number | null): string => {
    if (change === null) return "No data";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}% (24h)`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" style={{ color: C_YELLOW }} />
        <h3 className="text-lg font-semibold" style={{ color: C_FG }}>
          Whale Tracking
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="BTC Active Addresses"
          sublabel="Non-null wallets"
          value={activeAddresses.loading ? "..." : fmtCompact(activeAddresses.btc || 0)}
          signal={getSignal(activeAddresses.btcChange24h)}
          signalText={getSignalText(activeAddresses.btcChange24h)}
          icon={<Bitcoin className="w-4 h-4" style={{ color: C_FG }} />}
          loading={activeAddresses.loading}
        />
        <MetricCard
          label="ETH Active Addresses"
          sublabel="Non-null wallets"
          value={activeAddresses.loading ? "..." : fmtCompact(activeAddresses.eth || 0)}
          signal={getSignal(activeAddresses.ethChange24h)}
          signalText={getSignalText(activeAddresses.ethChange24h)}
          icon={<Layers className="w-4 h-4" style={{ color: C_FG }} />}
          loading={activeAddresses.loading}
        />
        <MetricCard
          label="Whale Wallets (BTC)"
          sublabel="Unique addresses"
          value={whaleWallets.loading ? "..." : whaleWallets.whaleCount.toLocaleString()}
          signal="neutral"
          signalText="24h period"
          icon={<Wallet className="w-4 h-4" style={{ color: C_FG }} />}
          loading={whaleWallets.loading}
        />
        <MetricCard
          label="Whale Volume (BTC)"
          sublabel="Total transferred"
          value={whaleWallets.loading ? "..." : fmtUsdCompact(whaleWallets.totalWhaleBalance)}
          signal="neutral"
          signalText="24h period"
          icon={<Activity className="w-4 h-4" style={{ color: C_FG }} />}
          loading={whaleWallets.loading}
        />
      </div>

      <div
        className="rounded-xl p-4"
        style={CARD_STYLE}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: C_YELLOW }} />
            <h4 className="text-sm font-semibold" style={{ color: C_FG }}>
              Recent Large BTC Transactions ({'>'}1 BTC)
            </h4>
          </div>
          {largeTransactions.stats && (
            <div className="text-xs" style={{ color: C_MID }}>
              <span style={{ color: C_CYAN }}>{largeTransactions.stats.whalePercentage}%</span> whale ({largeTransactions.stats.whaleTransactions}/{largeTransactions.stats.totalTransactions})
            </div>
          )}
        </div>
        {largeTransactions.loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : largeTransactions.error ? (
          <div className="text-sm" style={{ color: C_DIM }}>
            Failed to load large transactions
          </div>
        ) : largeTransactions.transactions.length === 0 ? (
          <div className="text-sm" style={{ color: C_DIM }}>
            No recent large transactions
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {largeTransactions.transactions.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between gap-3 p-3 rounded-lg"
                style={{ background: "oklch(1 0 0 / 0.03)" }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ArrowUpRight className="w-4 h-4 flex-shrink-0" style={{ color: C_GREEN }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium" style={{ color: C_FG }}>
                      BTC
                    </div>
                    <div className="text-xs truncate" style={{ color: C_MID }}>
                      {tx.sender.slice(0, 8)}... → {tx.recipient.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold" style={{ color: C_FG }}>
                    {tx.amount.toFixed(4)} BTC
                  </div>
                  <div className="text-xs" style={{ color: C_DIM }}>
                    {new Date(tx.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-xl p-4"
        style={CARD_STYLE}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" style={{ color: C_CYAN }} />
            <h4 className="text-sm font-semibold" style={{ color: C_FG }}>
              Recent Large ETH Transactions ({'>'}1 ETH)
            </h4>
          </div>
          {ethLargeTransactions.stats && (
            <div className="text-xs" style={{ color: C_MID }}>
              <span style={{ color: C_CYAN }}>{ethLargeTransactions.stats.whalePercentage}%</span> whale ({ethLargeTransactions.stats.whaleTransactions}/{ethLargeTransactions.stats.totalTransactions})
            </div>
          )}
        </div>
        {ethLargeTransactions.loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : ethLargeTransactions.error ? (
          <div className="text-sm" style={{ color: C_DIM }}>
            Failed to load ETH large transactions
          </div>
        ) : ethLargeTransactions.transactions.length === 0 ? (
          <div className="text-sm" style={{ color: C_DIM }}>
            No recent large ETH transactions
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {ethLargeTransactions.transactions.map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between gap-3 p-3 rounded-lg"
                style={{ background: "oklch(1 0 0 / 0.03)" }}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ArrowUpRight className="w-4 h-4 flex-shrink-0" style={{ color: C_CYAN }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium" style={{ color: C_FG }}>
                      ETH
                    </div>
                    <div className="text-xs truncate" style={{ color: C_MID }}>
                      {tx.sender.slice(0, 8)}... → {tx.recipient.slice(0, 8)}...
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold" style={{ color: C_FG }}>
                    {tx.amount.toFixed(4)} ETH
                  </div>
                  <div className="text-xs" style={{ color: C_DIM }}>
                    {new Date(tx.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
