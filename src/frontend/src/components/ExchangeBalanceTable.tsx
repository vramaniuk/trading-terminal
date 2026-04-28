import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BalanceDataPoint {
  date: string;
  value: number;
}

interface ExchangeBalanceData {
  exchange: string;
  asset: string;
  data: BalanceDataPoint[];
}

interface PercentageChanges {
  day24: number;
  day7: number;
  day30: number;
}

interface TableRowData {
  exchange: string;
  asset: string;
  currentValue: number;
  day24Change: number;
  day7Change: number;
  day30Change: number;
}

interface CumulativeData {
  totalBalance: number;
  day24Change: number;
  day7Change: number;
  day30Change: number;
}

const EXCHANGE_LABELS: Record<string, string> = {
  binance: "Binance",
  okx: "OKX",
  bybit: "Bybit",
  coinbasepro: "Coinbase Pro",
  bitfinex: "Bitfinex",
  kraken: "Kraken",
};

const EXCHANGE_COLORS: Record<string, string> = {
  binance: "oklch(0.637 0.220 25)",
  okx: "oklch(0.723 0.185 150)",
  bybit: "oklch(0.785 0.135 200)",
  coinbasepro: "oklch(0.637 0.220 25)",
  bitfinex: "oklch(0.785 0.135 200)",
  kraken: "oklch(0.723 0.185 150)",
};

const ASSET_LABELS = {
  btc: "BTC",
  eth: "ETH",
};

function formatValue(value: number, asset: string): string {
  return `${value.toLocaleString()} ${asset.toUpperCase()}`;
}

function calculatePercentageChanges(data: BalanceDataPoint[]): PercentageChanges {
  if (data.length < 2) {
    return { day24: 0, day7: 0, day30: 0 };
  }

  const latest = data[data.length - 1].value;
  const day24Index = Math.max(0, data.length - 2);
  const day7Index = Math.max(0, data.length - 8);
  const day30Index = Math.max(0, data.length - 31);

  const day24Change = data[day24Index].value
    ? ((latest - data[day24Index].value) / data[day24Index].value) * 100
    : 0;
  const day7Change = data[day7Index].value
    ? ((latest - data[day7Index].value) / data[day7Index].value) * 100
    : 0;
  const day30Change = data[day30Index].value
    ? ((latest - data[day30Index].value) / data[day30Index].value) * 100
    : 0;

  return { day24: day24Change, day7: day7Change, day30: day30Change };
}

function calculateCumulative(data: TableRowData[]): CumulativeData {
  const totalBalance = data.reduce((sum, row) => sum + row.currentValue, 0);
  
  // Weighted average of percentage changes based on balance size
  let weightedDay24 = 0;
  let weightedDay7 = 0;
  let weightedDay30 = 0;
  
  for (const row of data) {
    const weight = row.currentValue / totalBalance;
    weightedDay24 += row.day24Change * weight;
    weightedDay7 += row.day7Change * weight;
    weightedDay30 += row.day30Change * weight;
  }
  
  return {
    totalBalance,
    day24Change: weightedDay24,
    day7Change: weightedDay7,
    day30Change: weightedDay30,
  };
}

interface AssetTableProps {
  asset: string;
  data: TableRowData[];
  label: string;
}

function AssetTable({ asset, data, label }: AssetTableProps) {
  const cumulative = calculateCumulative(data);
  
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
          {label} Balances
        </h3>
        <p
          className="text-[10px]"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          Exchange reserves with percentage changes
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              <th
                className="text-left py-2 px-2 font-medium"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Exchange
              </th>
              <th
                className="text-right py-2 px-2 font-medium"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Balance
              </th>
              <th
                className="text-right py-2 px-2 font-medium"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                24h
              </th>
              <th
                className="text-right py-2 px-2 font-medium"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                7d
              </th>
              <th
                className="text-right py-2 px-2 font-medium"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                30d
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.exchange}
                style={{
                  borderBottom: "1px solid oklch(1 0 0 / 0.04)",
                }}
              >
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: EXCHANGE_COLORS[row.exchange] || "oklch(0.500 0.015 240)",
                      }}
                    />
                    <span
                      className="font-medium"
                      style={{ color: "oklch(0.870 0.012 240)" }}
                    >
                      {EXCHANGE_LABELS[row.exchange] || row.exchange}
                    </span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right">
                  <span
                    className="font-mono font-semibold"
                    style={{ color: "oklch(0.960 0.010 240)" }}
                  >
                    {formatValue(row.currentValue, asset)}
                  </span>
                </td>
                {[
                  { value: row.day24Change },
                  { value: row.day7Change },
                  { value: row.day30Change },
                ].map((item, idx) => {
                  const isPositive = item.value >= 0;
                  const color = isPositive
                    ? "oklch(0.723 0.185 150)"
                    : "oklch(0.637 0.220 25)";
                  return (
                    <td key={idx} className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" style={{ color }} />
                        ) : (
                          <TrendingDown className="w-3 h-3" style={{ color }} />
                        )}
                        <span
                          className="font-mono font-medium"
                          style={{ color }}
                        >
                          {isPositive ? "+" : ""}
                          {item.value.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Cumulative row */}
            <tr
              style={{
                borderBottom: "none",
                background: "oklch(1 0 0 / 0.03)",
              }}
            >
              <td className="py-2 px-2">
                <span
                  className="font-bold"
                  style={{ color: "oklch(0.910 0.015 240)" }}
                >
                  Total
                </span>
              </td>
              <td className="py-2 px-2 text-right">
                <span
                  className="font-mono font-bold"
                  style={{ color: "oklch(0.960 0.010 240)" }}
                >
                  {formatValue(cumulative.totalBalance, asset)}
                </span>
              </td>
              {[
                { value: cumulative.day24Change },
                { value: cumulative.day7Change },
                { value: cumulative.day30Change },
              ].map((item, idx) => {
                const isPositive = item.value >= 0;
                const color = isPositive
                  ? "oklch(0.723 0.185 150)"
                  : "oklch(0.637 0.220 25)";
                return (
                  <td key={idx} className="py-2 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3" style={{ color }} />
                      ) : (
                        <TrendingDown className="w-3 h-3" style={{ color }} />
                      )}
                      <span
                        className="font-mono font-bold"
                        style={{ color }}
                      >
                        {isPositive ? "+" : ""}
                        {item.value.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExchangeBalanceTable() {
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const exchanges = ["binance", "okx", "bybit", "coinbasepro", "bitfinex", "kraken"];
  const assets = ["btc", "eth"];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const BACKEND_API = import.meta.env.BACKEND_API || "http://localhost:3001";
      const results: TableRowData[] = [];

      for (const exchange of exchanges) {
        for (const asset of assets) {
          try {
            const res = await fetch(
              `${BACKEND_API}/api/analysis/exchange-balances?exchange=${exchange}&asset=${asset}&days=30`,
            );
            if (!res.ok) throw new Error("Failed to fetch data");
            const result: ExchangeBalanceData = await res.json();
            
            if (result.data && result.data.length > 0) {
              const percentageChanges = calculatePercentageChanges(result.data);
              const currentValue = result.data[result.data.length - 1].value;
              
              results.push({
                exchange,
                asset,
                currentValue,
                day24Change: percentageChanges.day24,
                day7Change: percentageChanges.day7,
                day30Change: percentageChanges.day30,
              });
            }
          } catch {
            // Skip failed individual requests
          }
        }
      }

      setTableData(results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const btcData = tableData.filter((row) => row.asset === "btc");
  const ethData = tableData.filter((row) => row.asset === "eth");

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h3
          className="text-sm font-semibold"
          style={{ color: "oklch(0.910 0.015 240)" }}
        >
          Exchange Balances
        </h3>
        <p
          className="text-[10px]"
          style={{ color: "oklch(0.450 0.015 240)" }}
        >
          BTC & ETH reserves with percentage changes across major exchanges
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton
            className="h-64 w-full rounded-xl"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
          <Skeleton
            className="h-64 w-full rounded-xl"
            style={{ background: "oklch(1 0 0 / 0.06)" }}
          />
        </div>
      ) : error ? (
        <div
          className="h-32 flex items-center justify-center text-xs rounded-xl"
          style={{
            background: "oklch(0.155 0.020 240)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            color: "oklch(0.450 0.015 240)",
          }}
        >
          Failed to load data
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AssetTable asset="btc" data={btcData} label="BTC" />
          <AssetTable asset="eth" data={ethData} label="ETH" />
        </div>
      )}
    </div>
  );
}
