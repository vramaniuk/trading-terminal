import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActor } from "../backend";
import type { Trade, TradingStats } from "../types/trades";

function useActor() {
  return useCaffeineActor(createActor);
}

export function useGetAllTrades() {
  const { actor, isFetching } = useActor();
  return useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      if (!actor) return [];
      const trades = await actor.getAllTrades();
      return trades.map((t) => ({
        id: t.id,
        asset: t.asset,
        // Backend enum: "long"/"short" → local type: "long_"/"short_"
        tradeType: (String(t.tradeType) === "long"
          ? "long_"
          : "short_") as Trade["tradeType"],
        status: String(t.status) as Trade["status"],
        quantity: t.quantity,
        entryPrice: t.entryPrice,
        currentPrice: t.currentPrice,
        pnl: t.pnl,
        mfe: t.mfe,
        mae: t.mae,
        timestamp: t.timestamp,
      }));
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useGetTradingStats() {
  const { actor, isFetching } = useActor();
  return useQuery<TradingStats>({
    queryKey: ["tradingStats"],
    queryFn: async (): Promise<TradingStats> => {
      if (!actor) {
        return {
          tradeCount: BigInt(0),
          avgTradePnl: 0,
          lossCount: BigInt(0),
          totalPnl: 0,
          winCount: BigInt(0),
          winRate: 0,
          netProfit: 0,
          avgMae: 0,
          avgMfe: 0,
        };
      }
      const stats = await actor.getTradingStats();
      return {
        tradeCount: stats.tradeCount,
        winCount: stats.winCount,
        lossCount: stats.lossCount,
        winRate: stats.winRate,
        totalPnl: stats.totalPnl,
        avgTradePnl: stats.avgTradePnl,
        netProfit: stats.netProfit,
        avgMfe: stats.avgMfe,
        avgMae: stats.avgMae,
      };
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSeedSampleTrades() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) return;
      await actor.seedSampleTrades();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}

export function useAddTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (trade: Trade) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.addTrade(
        trade as unknown as Parameters<typeof actor.addTrade>[0],
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}

export function useCloseTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      finalPrice,
    }: {
      id: bigint;
      finalPrice: number;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.closeTrade(id, finalPrice);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}

export function useDeleteTrade() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.deleteTrade(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["tradingStats"] });
    },
  });
}
