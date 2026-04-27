import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart2,
  DollarSign,
  Lock,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const DZENGI_API = "https://api-adapter.dzengi.com/api/v1";
const POLL_INTERVAL_MS = 10_000;
const COINGECKO_POLL_MS = 60_000;
const CORSPROXY = "https://corsproxy.io/?url=";
const COINGECKO_URL_P1 =
  "/coingecko/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";
const COINGECKO_URL_P2 =
  "/coingecko/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false";

// ---- Independent volume metrics hook ----
interface VolumeMetrics {
  spot: number;
  leverage: number;
  total: number;
  loading: boolean;
}

function useVolumeMetrics(): VolumeMetrics {
  const [state, setState] = useState<VolumeMetrics>({
    spot: 0,
    leverage: 0,
    total: 0,
    loading: true,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVolume = useCallback(async () => {
    try {
      const res = await fetch(`${DZENGI_API}/ticker/24hr`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const tickers = (await res.json()) as Array<{
        symbol: string;
        quoteVolume?: string;
      }>;
      let spot = 0;
      let leverage = 0;
      for (const t of tickers) {
        const vol = Number.parseFloat(t.quoteVolume ?? "0");
        if (!Number.isFinite(vol) || vol <= 0) continue;
        if (t.symbol.includes("_LEVERAGE")) {
          leverage += vol;
        } else {
          spot += vol;
        }
      }
      setState({ spot, leverage, total: spot + leverage, loading: false });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchVolume();
    timerRef.current = setInterval(fetchVolume, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchVolume]);

  return state;
}

// ---- CoinGecko market cap hook — fetches pages 1 & 2 (500 coins) ----
type CoinGeckoEntry = { symbol: string; market_cap: number | null };

async function fetchCoinGeckoPage(url: string): Promise<CoinGeckoEntry[]> {
  // Try direct first, fall back to corsproxy
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return (await res.json()) as CoinGeckoEntry[];
  } catch {
    // CORS blocked — fall through
  }
  const proxyRes = await fetch(`${CORSPROXY}${encodeURIComponent(url)}`);
  if (!proxyRes.ok) return [];
  return (await proxyRes.json()) as CoinGeckoEntry[];
}

function useMarketCaps(): Map<string, number> {
  const [capMap, setCapMap] = useState<Map<string, number>>(new Map());

  const fetchCaps = useCallback(async () => {
    try {
      const [p1, p2] = await Promise.all([
        fetchCoinGeckoPage(COINGECKO_URL_P1),
        fetchCoinGeckoPage(COINGECKO_URL_P2),
      ]);
      const all = [...p1, ...p2];
      const map = new Map<string, number>();
      for (const coin of all) {
        if (coin.symbol && coin.market_cap && coin.market_cap > 0) {
          map.set(coin.symbol.toUpperCase(), coin.market_cap);
        }
      }
      setCapMap(map);
    } catch {
      // keep previous
    }
  }, []);

  useEffect(() => {
    fetchCaps();
    const timer = setInterval(fetchCaps, COINGECKO_POLL_MS);
    return () => clearInterval(timer);
  }, [fetchCaps]);

  return capMap;
}

// ---- Types ----
interface TickerRow {
  symbol: string;
  cleanSymbol: string;
  lastPrice: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
  status?: "TRADING" | "BREAK" | "HALT";
  tradingHours?: string;
  marketCap?: number;
}

type SortKey = keyof Pick<
  TickerRow,
  | "cleanSymbol"
  | "lastPrice"
  | "priceChangePercent"
  | "volume"
  | "quoteVolume"
  | "highPrice"
  | "lowPrice"
  | "marketCap"
>;

type SortDir = "asc" | "desc";
type AssetCategory =
  | "all"
  | "crypto"
  | "forex"
  | "stocks"
  | "commodities"
  | "indexes";
type AssetType = "all" | "spot" | "leverage";

// ---- Asset classification ----

// Crypto base symbols — comprehensive list covering all Dzengi crypto pairs
const CRYPTO_BASES = new Set([
  "BTC",
  "ETH",
  "XRP",
  "BCH",
  "ADA",
  "SOL",
  "DOT",
  "LINK",
  "BNB",
  "DOGE",
  "AVAX",
  "MATIC",
  "UNI",
  "ATOM",
  "ALGO",
  "XLM",
  "TRX",
  "EOS",
  "XMR",
  "DASH",
  "ZEC",
  "NEO",
  "VET",
  "THETA",
  "FIL",
  "AAVE",
  "COMP",
  "MKR",
  "SNX",
  "YFI",
  "SUSHI",
  "CRV",
  "BAL",
  "1INCH",
  "GRT",
  "AXS",
  "SAND",
  "MANA",
  "ENJ",
  "CHZ",
  "HOT",
  "XEM",
  "NANO",
  "ZRX",
  "BAT",
  "OMG",
  "LRC",
  "KNC",
  "REN",
  "NMR",
  "OXT",
  "BAND",
  "STORJ",
  "KAVA",
  "ANKR",
  "CELR",
  "FET",
  "OCEAN",
  "RLC",
  "APE",
  "BNT",
  "CAKE",
  "CELO",
  "COTI",
  "CVC",
  "DAI",
  "ETC",
  "INJ",
  "JASMY",
  "LDO",
  "MEW",
  "PAXG",
  "QNT",
  "REP",
  "RSR",
  "RVN",
  "SHIB",
  "TON",
  "TWT",
  "UMA",
  "USDC",
  "USDT",
  "LTC",
  "XTZ",
  "ONT",
  "IOST",
  "IOTA",
  "QTUM",
  "ZIL",
  "ICX",
  "LOOM",
  "POLY",
  "MTL",
  "DNT",
  "FUN",
  "GNT",
  "MANA",
  "PPT",
  "STORM",
  "TNB",
  "WTC",
  "AMB",
  "ARN",
  "CDT",
  "CND",
  "EVX",
  "GAS",
  "GVT",
  "LEND",
  "MCO",
  "MOD",
  "MDA",
  "NAV",
  "NULS",
  "OAK",
  "POA",
  "POWR",
  "QSP",
  "RDN",
  "REQ",
  "SALT",
  "SNGLS",
  "SNT",
  "SUB",
  "VIB",
  "VIA",
  "WABI",
  "WINGS",
  "WPR",
  "XVG",
  "YOYO",
  "AGI",
  "ARN",
  "BLZ",
  "COCOS",
  "DOCK",
  "ENS",
  "FTM",
  "HNT",
  "KSM",
  "NEAR",
  "ONE",
  "RUNE",
  "SKL",
  "SRM",
  "STMX",
  "SXP",
  "ALPHA",
  "BADGER",
  "BEL",
  "BIFI",
  "CLV",
  "CTSI",
  "DEGO",
  "DEXE",
  "DODO",
  "DPI",
  "FIRO",
  "FOR",
  "GTC",
  "HBAR",
  "ICP",
  "IOTX",
  "KEEP",
  "KLV",
  "LAT",
  "LINA",
  "MASK",
  "NKTR",
  "NULS",
  "OG",
  "PERP",
  "POLS",
  "POND",
  "QUICK",
  "RAY",
  "REEF",
  "ROSE",
  "STPT",
  "SUN",
  "SUPER",
  "SWAP",
  "SYS",
  "TCT",
  "TRIBE",
  "TRB",
  "TVK",
  "UFT",
  "UTK",
  "VIDT",
  "WBTC",
  "WIN",
  "WRX",
  "XVSA",
  "YGG",
  "YFII",
  "ZEN",
  "LEVER",
  "HIGH",
  "FLOW",
  "APT",
  "ARB",
  "OP",
  "SEI",
  "SUI",
  "TIA",
  "JUP",
  "PYTH",
  "WEN",
  "JTO",
  "BOME",
  "MEME",
  "PEPE",
  "FLOKI",
  "BONK",
  "WIF",
  "ORDI",
  "SATS",
  "RATS",
  "NEON",
  "BLUR",
  "ID",
  "GMX",
  "RDNT",
  "SSV",
  "LQTY",
  "CVX",
  "FXS",
  "FRAX",
  "LUSD",
  "ALCX",
  "TOKE",
  "SPELL",
  "VOLT",
  "INDEX",
  "DATA",
  "AUDIO",
  "GHST",
  "RARE",
  "GODS",
  "ILV",
  "ALICE",
  "TLM",
  "RAMP",
  "DUSK",
  "FORTH",
  "BTRST",
  "AGLD",
  "MUSD",
  "POWR",
  "CTXC",
  "ACH",
  "AERGO",
  "ARPA",
  "AUTO",
  "BETA",
  "BNX",
  "CFX",
  "COCOS",
  "CPOOL",
  "DODO",
  "DYP",
  "FIDA",
  "FRONT",
  "HARD",
  "MDX",
  "MITH",
  "NBS",
  "NKN",
  "OOKI",
  "PUNDIX",
  "SFUND",
  "STMX",
  "SXP",
  "BZRX",
  "WNXM",
  "OHM",
  "TITAN",
  "SPELL",
  "ICE",
  "MAGIC",
  "GMX",
  "VELO",
  "MNGO",
  "PORT",
  "RAY",
  "SAMO",
  "STEP",
  "SLIM",
  "UPS",
  "MNDE",
  "SABER",
  "GRAPE",
  "LARIX",
  "ATLAS",
  "POLIS",
  "GENE",
  "EGS",
  "SHDW",
  "SGEM",
]);

// Forex currencies — fiat pairs
const FOREX_CURRENCIES = new Set([
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "HKD",
  "SGD",
  "MXN",
  "PLN",
  "HUF",
  "CZK",
  "TRY",
  "ZAR",
  "CNH",
  "ILS",
  "USD",
  "THB",
  "RON",
  "HRK",
]);

// Commodity base symbols
const COMMODITY_BASES = new Set([
  "XAU",
  "XAG",
  "XPT",
  "XPD",
  "OIL",
  "BRENT",
  "WTI",
  "NGAS",
  "GAS",
  "WHEAT",
  "CORN",
  "SOYA",
  "COFFEE",
  "COCOA",
  "SUGAR",
  "COTTON",
  "COPPER",
  "ALUM",
  "NICKEL",
  "ZINC",
  "LEAD",
  "PALM",
  "LUMBER",
  "MILK",
  "ETHANOL",
]);

// Index symbols — exact matches
const INDEX_SYMBOLS = new Set([
  "US100",
  "US500",
  "US30",
  "US2000",
  "DE40",
  "EU50",
  "FR40",
  "IT40",
  "SP35",
  "NL25",
  "CN50",
  "UK100",
  "HK50",
  "AU200",
  "JP225",
  "DXY",
  "FTSE",
  "DAX",
  "CAC",
  "NIKKEI",
  "AEX",
  "SMI",
  "IBEX",
  "OMX",
  "KOSP",
  "TWII",
  "SENSEX",
  "NIFTY",
  "NASDAQ",
  "VIX",
  "USDX",
  "DOLLAR",
]);

// Named commodity keywords (for display-name style symbols)
const COMMODITY_KEYWORDS = [
  "Gold",
  "Silver",
  "Oil",
  "Gas",
  "Copper",
  "Platinum",
  "Palladium",
  "Corn",
  "Soybean",
  "Wheat",
  "Coffee",
  "Cotton",
  "Sugar",
  "Cocoa",
  "Lead",
  "Nickel",
  "Zinc",
  "Alumin",
  "Lumber",
  "Palm",
  "Brent",
  "Crude",
];

// Stock suffixes (exchange codes used by Dzengi)
const STOCK_EXCHANGE_SUFFIXES = new Set([
  ".US",
  "US.",
  "NYSE.",
  "NASDAQ.",
  "AMEX.",
  ".DE",
  ".FR",
  ".UK",
  ".IT",
  ".ES",
  ".NL",
  ".CH",
  ".SE",
  ".DK",
  "HK.",
  "SG.",
  ".AU",
  ".JP",
  ".HK",
  ".KR",
  ".TW",
  "_US",
  "_DE",
  "_FR",
  "_UK",
]);

function classifyAsset(row: TickerRow): AssetCategory {
  const sym = row.cleanSymbol;

  // ---- Symbols without "/" ----
  if (!sym.includes("/")) {
    const upper = sym.toUpperCase();

    // Exact index match
    if (INDEX_SYMBOLS.has(upper)) return "indexes";

    // Named commodity keywords
    for (const kw of COMMODITY_KEYWORDS) {
      if (sym.includes(kw)) return "commodities";
    }

    // Symbols ending in "." are usually exchange-qualified stock tickers (e.g. "AAPL.", "ADS.DE.")
    if (sym.endsWith(".") || sym.includes(".")) return "stocks";

    // Pure crypto token symbols
    if (CRYPTO_BASES.has(upper)) return "crypto";

    // Check if it looks like an index (US100, DE40 style)
    if (/^[A-Z]{2,3}\d{2,3}$/.test(upper)) return "indexes";

    // All-uppercase 2-6 char tokens with no digits → likely a stock ticker
    if (/^[A-Z]{2,6}$/.test(upper)) return "stocks";

    // Anything with digits → likely a stock or index
    return "stocks";
  }

  // ---- Pair-based classification (BASE/QUOTE) ----
  const parts = sym.split("/");
  const base = parts[0].toUpperCase();
  const quote = parts[1]?.toUpperCase() ?? "";

  // Crypto: base OR quote is a known crypto token
  if (CRYPTO_BASES.has(base)) return "crypto";

  // Commodity: base is a commodity symbol
  if (COMMODITY_BASES.has(base)) return "commodities";

  // Forex: both sides are known fiat currencies
  if (FOREX_CURRENCIES.has(base) && FOREX_CURRENCIES.has(quote)) return "forex";

  // If base is a forex currency and quote isn't crypto → forex
  if (FOREX_CURRENCIES.has(base)) return "forex";

  // Check for stock exchange suffixes
  for (const suffix of STOCK_EXCHANGE_SUFFIXES) {
    if (sym.includes(suffix)) return "stocks";
  }

  // Fallback: single-word symbols that look like stock tickers
  if (/^[A-Z]{2,6}\//.test(sym) && FOREX_CURRENCIES.has(quote)) return "forex";

  // Default to stocks for unmatched pair symbols
  return "stocks";
}

function extractBase(cleanSym: string): string {
  return cleanSym.includes("/") ? cleanSym.split("/")[0] : cleanSym;
}

// ---- Formatters ----
function formatVolume(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

function formatBaseVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(4);
}

function formatMarketCap(cap: number): string {
  if (cap >= 1_000_000_000_000)
    return `$${(cap / 1_000_000_000_000).toFixed(2)}T`;
  if (cap >= 1_000_000_000) return `$${(cap / 1_000_000_000).toFixed(2)}B`;
  if (cap >= 1_000_000) return `$${(cap / 1_000_000).toFixed(1)}M`;
  if (cap >= 1_000) return `$${(cap / 1_000).toFixed(1)}K`;
  return `$${cap.toFixed(0)}`;
}

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

function cleanSymbol(sym: string): string {
  return sym.replace(/_LEVERAGE$/, "").replace(/_SPOT$/, "");
}

function parseTickerRow(item: Record<string, unknown>): TickerRow | null {
  const sym = String(item.symbol ?? "");
  if (!sym) return null;
  const lastPrice = Number.parseFloat(String(item.lastPrice ?? "0"));
  const priceChangePercent = Number.parseFloat(
    String(item.priceChangePercent ?? "0"),
  );
  const volume = Number.parseFloat(String(item.volume ?? "0"));
  const quoteVolume = Number.parseFloat(String(item.quoteVolume ?? "0"));
  const highPrice = Number.parseFloat(String(item.highPrice ?? "0"));
  const lowPrice = Number.parseFloat(String(item.lowPrice ?? "0"));
  const openPrice = Number.parseFloat(String(item.openPrice ?? "0"));
  return {
    symbol: sym,
    cleanSymbol: cleanSymbol(sym),
    lastPrice,
    priceChangePercent,
    volume,
    quoteVolume,
    highPrice,
    lowPrice,
    openPrice,
  };
}

// ---- Market status logic ----
function parseMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  return (
    Number.parseInt(parts[0], 10) * 60 + Number.parseInt(parts[1] ?? "0", 10)
  );
}

function computeStatusFromSchedule(
  tradingHours: string | undefined,
  apiStatus: string,
): "TRADING" | "BREAK" | "HALT" {
  if (apiStatus === "HALT") return "HALT";
  if (!tradingHours) return apiStatus as "TRADING" | "BREAK" | "HALT";

  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayName = dayNames[now.getUTCDay()];
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const segments = tradingHours
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(1); // skip "UTC" prefix

  const todaySegs = segments.filter(
    (seg) => seg.startsWith(`${todayName} `) || seg.startsWith(`${todayName},`),
  );

  if (todaySegs.length === 0) return "BREAK";

  for (const seg of todaySegs) {
    const rest = seg.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*/, "").trim();
    if (!rest) continue;

    for (const win of rest.split(",").map((w) => w.trim())) {
      const parts = win.split("-").map((p) => p.trim());
      let startMin = 0;
      let endMin = 1440;

      if (parts.length === 2) {
        startMin = parts[0] ? parseMinutes(parts[0]) : 0;
        const rawEnd = parts[1] ? parseMinutes(parts[1]) : 1440;
        // "00:00" as end time = end-of-day (1440), not midnight start (0)
        endMin = parts[1] && rawEnd === 0 ? 1440 : rawEnd;
      } else if (parts.length === 1 && parts[0]) {
        startMin = parseMinutes(parts[0]);
        endMin = 1440;
      }

      if (nowMinutes >= startMin && nowMinutes < endMin) return "TRADING";
    }
  }

  return "BREAK";
}

// ---- StatusCell ----
function StatusCell({ row }: { row: TickerRow }) {
  if (!row.status || row.status === "TRADING") {
    return (
      <span
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "oklch(0.723 0.185 150)" }}
        title={row.tradingHours}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: "oklch(0.723 0.185 150)" }}
        />
        Open
      </span>
    );
  }
  if (row.status === "HALT") {
    return (
      <span
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: "oklch(0.637 0.220 25)" }}
        title={row.tradingHours}
      >
        <Lock className="w-3 h-3 shrink-0" />
        Halted
      </span>
    );
  }
  return (
    <span
      className="flex items-center gap-1 text-xs font-medium"
      style={{ color: "oklch(0.85 0.18 85)" }}
      title={row.tradingHours}
    >
      <Lock className="w-3 h-3 shrink-0" />
      Closed
    </span>
  );
}

// ---- Volume Stat Card ----
interface VolumeStatCardProps {
  label: string;
  sublabel: string;
  value: number;
  pct: number;
  color: string;
  bgColor: string;
  loading: boolean;
  icon: React.ReactNode;
}

function VolumeStatCard({
  label,
  sublabel,
  value,
  pct,
  color,
  bgColor,
  loading,
  icon,
}: VolumeStatCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 flex-1 min-w-0"
      style={{
        background: "oklch(0.145 0.018 240)",
        border: "1px solid oklch(1 0 0 / 0.08)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: bgColor, color }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div
              className="text-xs font-semibold truncate"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              {label}
            </div>
            <div
              className="text-[10px] font-mono truncate"
              style={{ color: "oklch(0.450 0.015 240)" }}
            >
              {sublabel}
            </div>
          </div>
        </div>
        {!loading && (
          <span
            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full font-mono"
            style={{
              color,
              background: bgColor,
              border: `1px solid ${color}33`,
            }}
          >
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton
          className="h-8 w-32 rounded mt-1"
          style={{ background: "oklch(1 0 0 / 0.06)" }}
        />
      ) : (
        <>
          <div
            className="font-mono font-bold text-lg sm:text-xl mt-0.5 truncate min-w-0"
            style={{ color: "oklch(0.910 0.015 240)" }}
            title={fmtUsd(value)}
          >
            {fmtUsdCompact(value)}
          </div>
          <div
            className="relative h-1.5 rounded-full overflow-hidden"
            style={{ background: "oklch(1 0 0 / 0.07)" }}
          >
            <div
              className="absolute h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%`, background: color }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ---- Volume Stats Bar ----
function VolumeStatsBar({ metrics }: { metrics: VolumeMetrics }) {
  const { spot, leverage, total, loading } = metrics;
  const spotPct = total > 0 ? (spot / total) * 100 : 0;
  const levPct = total > 0 ? (leverage / total) * 100 : 0;

  return (
    <div
      className="px-5 py-4"
      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      data-ocid="volume.stats_bar"
    >
      <div
        className="text-[11px] font-semibold uppercase tracking-wider mb-3"
        style={{ color: "oklch(0.500 0.015 240)" }}
      >
        Exchange Volume (24h)
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <VolumeStatCard
          label="Spot Volume"
          sublabel="No _LEVERAGE suffix"
          value={spot}
          pct={spotPct}
          color="oklch(0.723 0.185 150)"
          bgColor="oklch(0.723 0.185 150 / 0.12)"
          loading={loading}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <VolumeStatCard
          label="Leverage Volume"
          sublabel="_LEVERAGE symbols"
          value={leverage}
          pct={levPct}
          color="oklch(0.785 0.135 200)"
          bgColor="oklch(0.785 0.135 200 / 0.12)"
          loading={loading}
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <VolumeStatCard
          label="Total Combined"
          sublabel="All symbols"
          value={total}
          pct={100}
          color="oklch(0.85 0.18 85)"
          bgColor="oklch(0.85 0.18 85 / 0.12)"
          loading={loading}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

// ---- Filter pill button ----
function FilterPill({
  active,
  onClick,
  children,
  accentColor = "oklch(0.785 0.135 200)",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 select-none"
      style={{
        background: active ? `${accentColor}26` : "oklch(1 0 0 / 0.04)",
        border: active
          ? `1px solid ${accentColor}8c`
          : "1px solid oklch(1 0 0 / 0.08)",
        color: active ? accentColor : "oklch(0.550 0.015 240)",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ---- Skeleton rows ----
const SKEL_ROWS = Array.from({ length: 12 }, (_, i) => `r${i + 1}`);
const SKEL_COLS = [
  { id: "sym", cls: "pl-5", w: "96px" },
  { id: "status", cls: "", w: "72px" },
  { id: "price", cls: "", w: "72px" },
  { id: "chg", cls: "", w: "72px" },
  { id: "vol", cls: "", w: "72px" },
  { id: "qvol", cls: "", w: "72px" },
  { id: "mktcap", cls: "", w: "80px" },
  { id: "hi", cls: "", w: "72px" },
  { id: "lo", cls: "pr-5", w: "72px" },
];

// ---- Filter configuration ----
const FILTER_TABS: { key: AssetCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "stocks", label: "Stocks" },
  { key: "indexes", label: "Indexes" },
  { key: "commodities", label: "Commodities" },
];

const TYPE_FILTERS: { key: AssetType; label: string }[] = [
  { key: "all", label: "All Types" },
  { key: "spot", label: "Spot" },
  { key: "leverage", label: "Leverage" },
];

// ---- Main component ----
interface VolumeTableProps {
  searchQuery?: string;
}

export function VolumeTable({ searchQuery = "" }: VolumeTableProps) {
  const volumeMetrics = useVolumeMetrics();
  const capMap = useMarketCaps();
  const [rows, setRows] = useState<TickerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("marketCap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [assetFilter, setAssetFilter] = useState<AssetCategory>("crypto");
  const [typeFilter, setTypeFilter] = useState<AssetType>("spot");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const isMountedRef = useRef(true);
  const exchangeInfoRef = useRef<
    Map<string, { status: string; tradingHours: string }>
  >(new Map());

  function handleCategoryChange(cat: AssetCategory) {
    setAssetFilter(cat);
    if (cat === "crypto") {
      setSortKey("marketCap");
      setSortDir("desc");
    } else if (assetFilter === "crypto") {
      setSortKey("quoteVolume");
      setSortDir("desc");
    }
  }

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  // Fetch exchangeInfo once for market status schedules
  useEffect(() => {
    fetch(`${DZENGI_API}/exchangeInfo`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, { status: string; tradingHours: string }>();
        for (const s of data.symbols ?? []) {
          map.set(s.symbol, {
            status: s.status ?? "TRADING",
            tradingHours: s.tradingHours ?? "",
          });
        }
        exchangeInfoRef.current = map;
        if (isMountedRef.current) {
          setRows((prev) =>
            prev.map((r) => {
              const info = map.get(r.symbol);
              return info
                ? {
                    ...r,
                    status: computeStatusFromSchedule(
                      info.tradingHours,
                      info.status,
                    ),
                    tradingHours: info.tradingHours,
                  }
                : r;
            }),
          );
        }
      })
      .catch(() => {});
  }, []);

  const fetchTickers = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch(`${DZENGI_API}/ticker/24hr`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const arr: unknown[] = Array.isArray(data) ? data : [];
      const parsed = arr
        .map((item) => parseTickerRow(item as Record<string, unknown>))
        .filter((r): r is TickerRow => r !== null);

      // Deduplicate: prefer non-dot variants (e.g. keep "Gold" over "Gold.")
      const noDotSet = new Set(
        parsed.map((r) => r.symbol).filter((s) => !s.endsWith(".")),
      );
      const deduped = parsed.filter(
        (r) => !r.symbol.endsWith(".") || !noDotSet.has(r.symbol.slice(0, -1)),
      );

      const mergedRows = deduped.map((r) => {
        const info = exchangeInfoRef.current.get(r.symbol);
        return info
          ? {
              ...r,
              status: computeStatusFromSchedule(info.tradingHours, info.status),
              tradingHours: info.tradingHours,
            }
          : r;
      });

      if (isMountedRef.current) {
        setRows(mergedRows);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch {
      if (isMountedRef.current) setLoading(false);
    } finally {
      if (isMountedRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchTickers();
    const timer = setInterval(() => fetchTickers(true), POLL_INTERVAL_MS);
    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [fetchTickers]);

  // Enrich rows with market cap from CoinGecko
  const enrichedRows: TickerRow[] = rows.map((r) => {
    const cat = classifyAsset(r);
    if (cat !== "crypto") return r;
    const base = extractBase(r.cleanSymbol);
    const cap = capMap.get(base) ?? capMap.get(base.toUpperCase());
    return cap !== undefined ? { ...r, marketCap: cap } : r;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "cleanSymbol" ? "asc" : "desc");
    }
  }

  // Per-category counts
  const categoryCounts: Record<AssetCategory, number> = {
    all: rows.length,
    crypto: rows.filter((r) => classifyAsset(r) === "crypto").length,
    forex: rows.filter((r) => classifyAsset(r) === "forex").length,
    stocks: rows.filter((r) => classifyAsset(r) === "stocks").length,
    indexes: rows.filter((r) => classifyAsset(r) === "indexes").length,
    commodities: rows.filter((r) => classifyAsset(r) === "commodities").length,
  };

  const typeCounts: Record<AssetType, number> = {
    all: rows.length,
    spot: rows.filter((r) => !r.symbol.includes("_LEVERAGE")).length,
    leverage: rows.filter((r) => r.symbol.includes("_LEVERAGE")).length,
  };

  const showMarketCap = assetFilter === "crypto" || assetFilter === "all";

  // Filter pipeline: category → type → search → open-only → sort
  const afterCategory =
    assetFilter === "all"
      ? enrichedRows
      : enrichedRows.filter((r) => classifyAsset(r) === assetFilter);

  const afterType =
    typeFilter === "all"
      ? afterCategory
      : typeFilter === "spot"
        ? afterCategory.filter((r) => !r.symbol.includes("_LEVERAGE"))
        : afterCategory.filter((r) => r.symbol.includes("_LEVERAGE"));

  const searchTerm = localSearch.trim().toUpperCase();
  const afterSearch = searchTerm
    ? afterType.filter((r) => r.cleanSymbol.toUpperCase().includes(searchTerm))
    : afterType;

  const afterOpenFilter = showOpenOnly
    ? afterSearch.filter((r) => r.status === "TRADING" || !r.status)
    : afterSearch;

  const sorted = [...afterOpenFilter].sort((a, b) => {
    if (sortKey === "marketCap") {
      const aVal = a.marketCap ?? -1;
      const bVal = b.marketCap ?? -1;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === "string" && typeof bv === "string") {
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = (av as number | undefined) ?? 0;
    const bn = (bv as number | undefined) ?? 0;
    return sortDir === "asc" ? an - bn : bn - an;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return (
        <ArrowUpDown
          className="w-3 h-3 ml-1 inline opacity-40"
          style={{ color: "oklch(0.500 0.015 240)" }}
        />
      );
    return sortDir === "asc" ? (
      <ArrowUp
        className="w-3 h-3 ml-1 inline"
        style={{ color: "oklch(0.785 0.135 200)" }}
      />
    ) : (
      <ArrowDown
        className="w-3 h-3 ml-1 inline"
        style={{ color: "oklch(0.785 0.135 200)" }}
      />
    );
  }

  const headerBtn = (label: string, col: SortKey) => (
    <button
      type="button"
      className="flex items-center gap-0.5 cursor-pointer select-none hover:opacity-80 transition-opacity"
      onClick={() => handleSort(col)}
      style={{
        color:
          sortKey === col ? "oklch(0.785 0.135 200)" : "oklch(0.500 0.015 240)",
        fontWeight: sortKey === col ? 600 : 500,
      }}
    >
      {label}
      <SortIcon col={col} />
    </button>
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.155 0.020 240), oklch(0.148 0.018 240))",
        border: "1px solid oklch(1 0 0 / 0.08)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
      data-ocid="volume.panel"
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        {/* Title + badges row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              className="text-base font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              All Dzengi Assets
            </h2>
            {lastUpdated && (
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {refreshing && (
              <RefreshCw
                className="w-3.5 h-3.5 animate-spin"
                style={{ color: "oklch(0.785 0.135 200)" }}
              />
            )}
            {!loading && (
              <span
                className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: "oklch(0.785 0.135 200 / 0.10)",
                  color: "oklch(0.785 0.135 200)",
                  border: "1px solid oklch(0.785 0.135 200 / 0.25)",
                }}
              >
                {sorted.length === rows.length
                  ? `${rows.length} pairs`
                  : `${sorted.length} / ${rows.length} pairs`}
              </span>
            )}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: loading
                  ? "oklch(0.85 0.18 85 / 0.12)"
                  : "oklch(0.723 0.185 150 / 0.12)",
                border: `1px solid ${loading ? "oklch(0.85 0.18 85 / 0.3)" : "oklch(0.723 0.185 150 / 0.3)"}`,
              }}
            >
              <Wifi
                className="w-3 h-3"
                style={{
                  color: loading
                    ? "oklch(0.85 0.18 85)"
                    : "oklch(0.723 0.185 150)",
                }}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: loading
                    ? "oklch(0.85 0.18 85)"
                    : "oklch(0.723 0.185 150)",
                }}
              >
                {loading ? "LOADING" : "LIVE"}
              </span>
            </div>
          </div>
        </div>

        {/* Search + Open Only row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
          <div className="relative w-full sm:w-56 shrink-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: "oklch(0.500 0.015 240)" }}
            />
            <Input
              data-ocid="volume.search_input"
              placeholder="Search symbol..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-full"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                color: "oklch(0.910 0.015 240)",
              }}
            />
          </div>
          <FilterPill
            active={showOpenOnly}
            onClick={() => setShowOpenOnly((v) => !v)}
            accentColor="oklch(0.723 0.185 150)"
          >
            {showOpenOnly ? (
              <span
                className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "oklch(0.723 0.185 150)" }}
              />
            ) : (
              <Wifi className="w-3 h-3 shrink-0" />
            )}
            <span data-ocid="volume.open_only.toggle">Open Only</span>
          </FilterPill>
        </div>

        {/* Type filter row */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider mr-0.5 shrink-0"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            Type:
          </span>
          {TYPE_FILTERS.map((tf) => {
            const isActive = typeFilter === tf.key;
            const count = typeCounts[tf.key];
            const accent =
              tf.key === "spot"
                ? "oklch(0.723 0.185 150)"
                : "oklch(0.785 0.135 200)";
            return (
              <FilterPill
                key={tf.key}
                active={isActive}
                onClick={() => setTypeFilter(tf.key)}
                accentColor={accent}
              >
                <span data-ocid={`volume.type_filter.${tf.key}`}>
                  {tf.label}
                </span>
                {!loading && (
                  <span
                    className="font-mono text-[10px] px-1 py-0 rounded"
                    style={{
                      background: isActive
                        ? "oklch(0.785 0.135 200 / 0.20)"
                        : "oklch(1 0 0 / 0.06)",
                      color: isActive
                        ? "oklch(0.785 0.135 200)"
                        : "oklch(0.450 0.015 240)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </FilterPill>
            );
          })}
        </div>

        {/* Category filter row */}
        <div
          className="flex flex-wrap items-center gap-1.5 mt-2"
          data-ocid="volume.filter.tab"
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-wider mr-0.5 shrink-0"
            style={{ color: "oklch(0.450 0.015 240)" }}
          >
            Category:
          </span>
          {FILTER_TABS.map((tab) => {
            const isActive = assetFilter === tab.key;
            const count = categoryCounts[tab.key];
            return (
              <FilterPill
                key={tab.key}
                active={isActive}
                onClick={() => handleCategoryChange(tab.key)}
              >
                <span>{tab.label}</span>
                {!loading && (
                  <span
                    className="font-mono text-[10px] px-1 py-0 rounded"
                    style={{
                      background: isActive
                        ? "oklch(0.785 0.135 200 / 0.20)"
                        : "oklch(1 0 0 / 0.06)",
                      color: isActive
                        ? "oklch(0.785 0.135 200)"
                        : "oklch(0.450 0.015 240)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </FilterPill>
            );
          })}
        </div>
      </div>

      {/* Volume stats bar — independent fetch */}
      <VolumeStatsBar metrics={volumeMetrics} />

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow
              style={{
                background: "oklch(0.145 0.018 240)",
                borderBottom: "1px solid oklch(1 0 0 / 0.07)",
              }}
            >
              <TableHead className="pl-5 py-3 text-xs whitespace-nowrap">
                {headerBtn("Symbol", "cleanSymbol")}
              </TableHead>
              <TableHead
                className="py-3 text-xs whitespace-nowrap"
                style={{ color: "oklch(0.500 0.015 240)", fontWeight: 500 }}
              >
                Status
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("Last Price", "lastPrice")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("24h Change", "priceChangePercent")}
              </TableHead>
              <TableHead className="hidden sm:table-cell py-3 text-xs whitespace-nowrap">
                {headerBtn("Volume", "volume")}
              </TableHead>
              <TableHead className="py-3 text-xs whitespace-nowrap">
                {headerBtn("Quote Vol", "quoteVolume")}
              </TableHead>
              {showMarketCap && (
                <TableHead className="hidden sm:table-cell py-3 text-xs whitespace-nowrap">
                  {headerBtn("Mkt Cap", "marketCap")}
                </TableHead>
              )}
              <TableHead className="hidden md:table-cell py-3 text-xs whitespace-nowrap">
                {headerBtn("24h High", "highPrice")}
              </TableHead>
              <TableHead className="hidden md:table-cell pr-5 py-3 text-xs whitespace-nowrap">
                {headerBtn("24h Low", "lowPrice")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? SKEL_ROWS.map((rowId, rowIdx) => (
                  <TableRow
                    key={rowId}
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}
                    data-ocid={`volume.item.${rowIdx + 1}`}
                  >
                    {SKEL_COLS.map((col) => (
                      <TableCell key={col.id} className={`py-3 ${col.cls}`}>
                        <Skeleton
                          className="h-4 rounded"
                          style={{
                            width: col.w,
                            background: "oklch(1 0 0 / 0.06)",
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : sorted.map((row, idx) => {
                  const isPositive = row.priceChangePercent >= 0;
                  const isCrypto = classifyAsset(row) === "crypto";
                  return (
                    <TableRow
                      key={row.symbol}
                      data-ocid={`volume.item.${idx + 1}`}
                      className="transition-colors cursor-default"
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "oklch(1 0 0 / 0.025)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "";
                      }}
                    >
                      {/* Symbol */}
                      <TableCell className="pl-5 py-3">
                        <div className="flex flex-col">
                          <span
                            className="text-sm font-semibold font-mono whitespace-nowrap"
                            style={{ color: "oklch(0.910 0.015 240)" }}
                          >
                            {row.cleanSymbol}
                          </span>
                          {row.symbol.includes("_LEVERAGE") ? (
                            <span
                              className="text-[10px] mt-0.5 font-medium"
                              style={{ color: "oklch(0.785 0.135 200)" }}
                            >
                              Leverage
                            </span>
                          ) : row.symbol.includes("_SPOT") ? (
                            <span
                              className="text-[10px] mt-0.5 font-medium"
                              style={{ color: "oklch(0.723 0.185 150)" }}
                            >
                              Spot
                            </span>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <StatusCell row={row} />
                      </TableCell>

                      {/* Last Price */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.870 0.012 240)" }}
                        >
                          {row.lastPrice > 0
                            ? row.lastPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </span>
                      </TableCell>

                      {/* 24h Change */}
                      <TableCell className="py-3">
                        <div
                          className="flex items-center gap-1 text-sm font-semibold"
                          style={{
                            color: isPositive
                              ? "oklch(0.723 0.185 150)"
                              : "oklch(0.637 0.220 25)",
                          }}
                        >
                          {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="font-mono">
                            {isPositive ? "+" : ""}
                            {row.priceChangePercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Volume (base) — hidden on mobile */}
                      <TableCell className="hidden sm:table-cell py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.700 0.015 240)" }}
                        >
                          {row.volume > 0 ? formatBaseVolume(row.volume) : "—"}
                        </span>
                      </TableCell>

                      {/* Quote Volume (USD) */}
                      <TableCell className="py-3">
                        <span
                          className="font-mono text-sm font-medium"
                          style={{ color: "oklch(0.785 0.135 200)" }}
                        >
                          {row.quoteVolume > 0
                            ? formatVolume(row.quoteVolume)
                            : "—"}
                        </span>
                      </TableCell>

                      {/* Market Cap — hidden on mobile */}
                      {showMarketCap && (
                        <TableCell className="hidden sm:table-cell py-3">
                          {isCrypto && row.marketCap ? (
                            <span
                              className="font-mono text-sm font-medium"
                              style={{ color: "oklch(0.85 0.18 85)" }}
                              title={`$${row.marketCap.toLocaleString("en-US")}`}
                            >
                              {formatMarketCap(row.marketCap)}
                            </span>
                          ) : (
                            <span
                              className="font-mono text-sm"
                              style={{ color: "oklch(0.350 0.010 240)" }}
                            >
                              —
                            </span>
                          )}
                        </TableCell>
                      )}

                      {/* 24h High */}
                      <TableCell className="hidden md:table-cell py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.723 0.185 150)" }}
                        >
                          {row.highPrice > 0
                            ? row.highPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </span>
                      </TableCell>

                      {/* 24h Low */}
                      <TableCell className="hidden md:table-cell pr-5 py-3">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "oklch(0.637 0.220 25)" }}
                        >
                          {row.lowPrice > 0
                            ? row.lowPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Empty state */}
      {!loading && sorted.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 gap-3"
          data-ocid="volume.empty_state"
        >
          <span className="text-4xl" role="img" aria-label="no data">
            📊
          </span>
          <p className="text-sm" style={{ color: "oklch(0.500 0.015 240)" }}>
            {searchTerm
              ? `No assets matching "${localSearch}"`
              : showOpenOnly
                ? "No open markets in this category right now"
                : "No assets found in this category"}
          </p>
        </div>
      )}
    </div>
  );
}
