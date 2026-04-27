import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAddTrade,
  useCloseTrade,
  useDeleteTrade,
  useGetAllTrades,
} from "../hooks/useQueries";
import { Status, type Trade, TradeType } from "../types/trades";

const SKELETON_ROWS = ["r1", "r2", "r3", "r4"];
const SKELETON_CELLS = [
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
];

const TRADEABLE_ASSETS = [
  "BTC/USD",
  "ETH/USD",
  "XRP/USD",
  "BNB/USD",
  "SOL/USD",
  "ADA/USD",
  "DOT/USD",
  "LINK/USD",
  "AAPL",
  "TSLA",
  "NVDA",
  "MSFT",
  "AMZN",
  "GOLD",
  "SILVER",
  "OIL/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
];

function fmtUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPrice(n: number): string {
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 1)
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function fmtTimestamp(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

// ── New Trade Modal ─────────────────────────────────────────────────────────────
interface NewTradeFormState {
  asset: string;
  tradeType: TradeType;
  entryPrice: string;
  quantity: string;
  stopLoss: string;
  takeProfit: string;
}

const DEFAULT_FORM: NewTradeFormState = {
  asset: "BTC/USD",
  tradeType: TradeType.long_,
  entryPrice: "",
  quantity: "",
  stopLoss: "",
  takeProfit: "",
};

function NewTradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NewTradeFormState>(DEFAULT_FORM);
  const addTrade = useAddTrade();

  function field(key: keyof NewTradeFormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entryPrice = Number.parseFloat(form.entryPrice);
    const quantity = Number.parseFloat(form.quantity);
    if (
      !form.asset ||
      Number.isNaN(entryPrice) ||
      Number.isNaN(quantity) ||
      quantity <= 0
    ) {
      toast.error("Please fill in all required fields with valid values.");
      return;
    }
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const newTrade: Trade = {
      id: now,
      asset: form.asset,
      tradeType: form.tradeType,
      status: Status.open,
      quantity,
      entryPrice,
      currentPrice: entryPrice,
      pnl: 0,
      mfe: 0,
      mae: 0,
      timestamp: now,
    };
    addTrade.mutate(newTrade, {
      onSuccess: () => {
        toast.success(
          `${form.asset} ${form.tradeType === TradeType.long_ ? "Long" : "Short"} trade logged.`,
        );
        setForm(DEFAULT_FORM);
        onClose();
      },
      onError: () => toast.error("Failed to add trade. Please try again."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "oklch(0.155 0.020 240)",
          border: "1px solid oklch(1 0 0 / 0.12)",
          color: "oklch(0.910 0.015 240)",
        }}
        data-ocid="new_trade.dialog"
      >
        <DialogHeader>
          <DialogTitle
            className="text-base font-semibold"
            style={{ color: "oklch(0.910 0.015 240)" }}
          >
            Log New Trade
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Asset */}
          <div className="space-y-1.5">
            <Label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              Asset
            </Label>
            <Select value={form.asset} onValueChange={(v) => field("asset", v)}>
              <SelectTrigger
                data-ocid="new_trade.asset.select"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.870 0.012 240)",
                }}
              >
                <SelectValue placeholder="Select asset" />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "oklch(0.168 0.020 240)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                }}
              >
                {TRADEABLE_ASSETS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trade Type */}
          <div className="space-y-1.5">
            <Label
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "oklch(0.500 0.015 240)" }}
            >
              Trade Type
            </Label>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="new_trade.long_toggle"
                onClick={() => field("tradeType", TradeType.long_)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background:
                    form.tradeType === TradeType.long_
                      ? "oklch(0.723 0.185 150 / 0.18)"
                      : "oklch(1 0 0 / 0.04)",
                  border:
                    form.tradeType === TradeType.long_
                      ? "1px solid oklch(0.723 0.185 150 / 0.4)"
                      : "1px solid oklch(1 0 0 / 0.08)",
                  color:
                    form.tradeType === TradeType.long_
                      ? "oklch(0.723 0.185 150)"
                      : "oklch(0.500 0.015 240)",
                }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Long
              </button>
              <button
                type="button"
                data-ocid="new_trade.short_toggle"
                onClick={() => field("tradeType", TradeType.short_)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background:
                    form.tradeType === TradeType.short_
                      ? "oklch(0.637 0.220 25 / 0.18)"
                      : "oklch(1 0 0 / 0.04)",
                  border:
                    form.tradeType === TradeType.short_
                      ? "1px solid oklch(0.637 0.220 25 / 0.4)"
                      : "1px solid oklch(1 0 0 / 0.08)",
                  color:
                    form.tradeType === TradeType.short_
                      ? "oklch(0.637 0.220 25)"
                      : "oklch(0.500 0.015 240)",
                }}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                Short
              </button>
            </div>
          </div>

          {/* Entry Price + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Entry Price *
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 65000"
                value={form.entryPrice}
                onChange={(e) => field("entryPrice", e.target.value)}
                data-ocid="new_trade.entry_price.input"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.870 0.012 240)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Quantity *
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 0.1"
                value={form.quantity}
                onChange={(e) => field("quantity", e.target.value)}
                data-ocid="new_trade.quantity.input"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.870 0.012 240)",
                }}
              />
            </div>
          </div>

          {/* Stop Loss + Take Profit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Stop Loss
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Optional"
                value={form.stopLoss}
                onChange={(e) => field("stopLoss", e.target.value)}
                data-ocid="new_trade.stop_loss.input"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.870 0.012 240)",
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "oklch(0.500 0.015 240)" }}
              >
                Take Profit
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Optional"
                value={form.takeProfit}
                onChange={(e) => field("takeProfit", e.target.value)}
                data-ocid="new_trade.take_profit.input"
                style={{
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid oklch(1 0 0 / 0.10)",
                  color: "oklch(0.870 0.012 240)",
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="new_trade.cancel_button"
              className="flex-1 transition-all duration-200"
              style={{
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.10)",
                color: "oklch(0.600 0.015 240)",
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addTrade.isPending}
              data-ocid="new_trade.submit_button"
              className="flex-1 font-semibold transition-all duration-200"
              style={{
                background:
                  form.tradeType === TradeType.long_
                    ? "oklch(0.723 0.185 150 / 0.85)"
                    : "oklch(0.637 0.220 25 / 0.85)",
                color: "oklch(0.98 0.005 240)",
              }}
            >
              {addTrade.isPending ? "Logging..." : "Log Trade"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation ─────────────────────────────────────────────────────────
function DeleteConfirm({
  tradeId,
  asset,
  onCancel,
}: {
  tradeId: bigint;
  asset: string;
  onCancel: () => void;
}) {
  const deleteTrade = useDeleteTrade();
  return (
    <div
      className="flex items-center gap-2 text-xs"
      data-ocid="trades.delete_confirm"
    >
      <AlertTriangle
        className="w-3.5 h-3.5 flex-shrink-0"
        style={{ color: "oklch(0.800 0.180 50)" }}
      />
      <span style={{ color: "oklch(0.700 0.015 240)" }}>Delete {asset}?</span>
      <button
        type="button"
        data-ocid="trades.confirm_button"
        onClick={() =>
          deleteTrade.mutate(tradeId, {
            onSuccess: () => toast.success("Trade deleted."),
            onError: () => toast.error("Failed to delete."),
          })
        }
        disabled={deleteTrade.isPending}
        className="px-2 py-0.5 rounded text-xs font-semibold transition-colors duration-150"
        style={{
          background: "oklch(0.637 0.220 25 / 0.20)",
          color: "oklch(0.637 0.220 25)",
        }}
      >
        {deleteTrade.isPending ? "..." : "Yes"}
      </button>
      <button
        type="button"
        data-ocid="trades.cancel_button"
        onClick={onCancel}
        className="px-2 py-0.5 rounded text-xs font-semibold transition-colors duration-150"
        style={{
          background: "oklch(1 0 0 / 0.05)",
          color: "oklch(0.500 0.015 240)",
        }}
      >
        No
      </button>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────
export function TradesTable() {
  const { data: trades = [], isLoading: loading } = useGetAllTrades();
  const closeTrade = useCloseTrade();
  const [newTradeOpen, setNewTradeOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<bigint | null>(null);

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
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
          className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-5 py-3 sm:py-4 gap-3"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
        >
          <div className="flex items-center gap-3">
            <h2
              className="text-base font-semibold"
              style={{ color: "oklch(0.910 0.015 240)" }}
            >
              Active Trades &amp; Orders
            </h2>
            {!loading && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: "oklch(0.785 0.135 200 / 0.15)",
                  color: "oklch(0.785 0.135 200)",
                }}
              >
                {trades.length} {trades.length === 1 ? "trade" : "trades"}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => setNewTradeOpen(true)}
            data-ocid="trades.add_button"
            className="flex items-center gap-1.5 font-semibold text-xs h-8 px-3 transition-all duration-200 w-fit"
            style={{
              background: "oklch(0.785 0.135 200 / 0.15)",
              border: "1px solid oklch(0.785 0.135 200 / 0.3)",
              color: "oklch(0.785 0.135 200)",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Trade
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" data-ocid="trades.table">
          <Table>
            <TableHeader>
              <TableRow
                style={{
                  borderBottom: "1px solid oklch(1 0 0 / 0.07)",
                  background: "transparent",
                }}
              >
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Type
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Asset
                </TableHead>
                <TableHead
                  className="hidden sm:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Qty
                </TableHead>
                <TableHead
                  className="hidden md:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Entry
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Price
                </TableHead>
                <TableHead
                  className="hidden sm:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Opened
                </TableHead>
                <TableHead
                  className="hidden md:table-cell text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  MFE / MAE
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Status
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  P / L
                </TableHead>
                <TableHead
                  className="text-[11px] uppercase tracking-wider font-medium py-3"
                  style={{ color: "oklch(0.500 0.015 240)" }}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                SKELETON_ROWS.map((rowKey) => (
                  <TableRow
                    key={rowKey}
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 0.05)" }}
                  >
                    {SKELETON_CELLS.map((cellKey) => (
                      <TableCell key={cellKey} className="py-3">
                        <Skeleton
                          className="h-4 rounded"
                          style={{ background: "oklch(1 0 0 / 0.05)" }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : trades.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-14 text-center"
                    data-ocid="trades.empty_state"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: "oklch(1 0 0 / 0.04)" }}
                      >
                        <TrendingUp
                          className="w-6 h-6"
                          style={{ color: "oklch(0.350 0.015 240)" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "oklch(0.650 0.015 240)" }}
                        >
                          No trades recorded yet
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "oklch(0.400 0.012 240)" }}
                        >
                          Click "New Trade" to log your first position
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                trades.map((trade, idx) => {
                  const isLong = trade.tradeType === TradeType.long_;
                  const isOpen = trade.status === Status.open;
                  const isPnlPositive = trade.pnl >= 0;
                  const pnlPct =
                    trade.entryPrice > 0
                      ? ((trade.currentPrice - trade.entryPrice) /
                          trade.entryPrice) *
                        100 *
                        (isLong ? 1 : -1)
                      : 0;
                  const ocidIdx = idx + 1;
                  const isConfirmingDelete = confirmDeleteId === trade.id;

                  return (
                    <TableRow
                      key={String(trade.id)}
                      data-ocid={`trades.item.${ocidIdx}`}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.05)" }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "oklch(1 0 0 / 0.02)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "transparent";
                      }}
                    >
                      {/* Type */}
                      <TableCell className="py-3">
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md w-fit text-xs font-semibold"
                          style={{
                            background: isLong
                              ? "oklch(0.723 0.185 150 / 0.12)"
                              : "oklch(0.637 0.220 25 / 0.12)",
                            color: isLong
                              ? "oklch(0.723 0.185 150)"
                              : "oklch(0.637 0.220 25)",
                          }}
                        >
                          {isLong ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownLeft className="w-3 h-3" />
                          )}
                          {isLong ? "Long" : "Short"}
                        </div>
                      </TableCell>

                      {/* Asset */}
                      <TableCell className="py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "oklch(0.910 0.015 240)" }}
                        >
                          {trade.asset}
                        </span>
                      </TableCell>

                      {/* Quantity — hidden mobile */}
                      <TableCell className="hidden sm:table-cell py-3">
                        <span
                          className="text-xs font-mono"
                          style={{ color: "oklch(0.600 0.015 240)" }}
                        >
                          {trade.quantity.toFixed(4)}
                        </span>
                      </TableCell>

                      {/* Entry — hidden sm */}
                      <TableCell className="hidden md:table-cell py-3">
                        <span
                          className="text-xs font-mono"
                          style={{ color: "oklch(0.650 0.015 240)" }}
                        >
                          {fmtPrice(trade.entryPrice)}
                        </span>
                      </TableCell>

                      {/* Current Price */}
                      <TableCell className="py-3">
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: "oklch(0.870 0.012 240)" }}
                        >
                          {fmtPrice(trade.currentPrice)}
                        </span>
                      </TableCell>

                      {/* Opened — hidden mobile */}
                      <TableCell className="hidden sm:table-cell py-3">
                        <span
                          className="text-xs"
                          style={{ color: "oklch(0.450 0.012 240)" }}
                        >
                          {fmtTimestamp(trade.timestamp)}
                        </span>
                      </TableCell>

                      {/* MFE / MAE — hidden sm */}
                      <TableCell className="hidden md:table-cell py-3">
                        <div className="text-xs font-mono">
                          <span style={{ color: "oklch(0.723 0.185 150)" }}>
                            +{trade.mfe.toFixed(2)}%
                          </span>
                          <span style={{ color: "oklch(0.350 0.015 240)" }}>
                            {" "}
                            /{" "}
                          </span>
                          <span style={{ color: "oklch(0.637 0.220 25)" }}>
                            -{Math.abs(trade.mae).toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <div
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit"
                          style={{
                            background: isOpen
                              ? "oklch(0.723 0.185 150 / 0.10)"
                              : "oklch(1 0 0 / 0.05)",
                            color: isOpen
                              ? "oklch(0.723 0.185 150)"
                              : "oklch(0.420 0.012 240)",
                          }}
                        >
                          {isOpen && (
                            <span
                              className="w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ background: "oklch(0.723 0.185 150)" }}
                            />
                          )}
                          {isOpen ? "Live" : "Closed"}
                        </div>
                      </TableCell>

                      {/* P/L */}
                      <TableCell className="py-3">
                        <div>
                          <div
                            className="flex items-center gap-1 text-sm font-bold font-mono"
                            style={{
                              color: isPnlPositive
                                ? "oklch(0.723 0.185 150)"
                                : "oklch(0.637 0.220 25)",
                            }}
                          >
                            {isPnlPositive ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {fmtUsd(trade.pnl)}
                          </div>
                          <div
                            className="text-[10px] font-mono"
                            style={{
                              color: isPnlPositive
                                ? "oklch(0.600 0.120 150)"
                                : "oklch(0.550 0.120 25)",
                            }}
                          >
                            {fmtPct(pnlPct)}
                          </div>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3">
                        {isConfirmingDelete ? (
                          <DeleteConfirm
                            tradeId={trade.id}
                            asset={trade.asset}
                            onCancel={() => setConfirmDeleteId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            {isOpen && (
                              <button
                                type="button"
                                data-ocid={`trades.close_button.${ocidIdx}`}
                                onClick={() =>
                                  closeTrade.mutate(
                                    {
                                      id: trade.id,
                                      finalPrice: trade.currentPrice,
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success(
                                          `${trade.asset} trade closed.`,
                                        ),
                                      onError: () =>
                                        toast.error("Failed to close trade."),
                                    },
                                  )
                                }
                                disabled={closeTrade.isPending}
                                className="px-2 py-1 rounded text-[11px] font-semibold transition-all duration-150 hover:opacity-80"
                                style={{
                                  background: "oklch(0.785 0.135 200 / 0.12)",
                                  color: "oklch(0.785 0.135 200)",
                                }}
                                title="Close trade at current price"
                              >
                                Close
                              </button>
                            )}
                            <button
                              type="button"
                              data-ocid={`trades.delete_button.${ocidIdx}`}
                              onClick={() => setConfirmDeleteId(trade.id)}
                              className="p-1.5 rounded transition-all duration-150 hover:opacity-80"
                              style={{
                                background: "oklch(0.637 0.220 25 / 0.10)",
                                color: "oklch(0.637 0.220 25 / 0.7)",
                              }}
                              title="Delete trade"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <NewTradeModal
        open={newTradeOpen}
        onClose={() => setNewTradeOpen(false)}
      />
    </>
  );
}
