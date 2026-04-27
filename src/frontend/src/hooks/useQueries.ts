import { useMutation, useQuery } from "@tanstack/react-query";

// Mock hook for trading functionality (to be implemented with backend later)
// Returns empty data to prevent crashes while components are kept for future development

export function useGetAllTrades() {
  return useQuery({
    queryKey: ["trades"],
    queryFn: async () => [],
  });
}

export function useGetTradingStats() {
  return useQuery({
    queryKey: ["tradingStats"],
    queryFn: async () => ({
      totalPnl: 0,
      netProfit: 0,
      tradeCount: 0,
      winRate: 0,
      avgMfe: 0,
      avgMae: 0,
      avgTradePnl: 0,
      winCount: 0,
      lossCount: 0,
    }),
  });
}

export function useAddTrade() {
  return useMutation({
    mutationFn: async () => {
      console.log("Trade addition not implemented yet");
    },
  });
}

export function useCloseTrade() {
  return useMutation({
    mutationFn: async () => {
      console.log("Trade closing not implemented yet");
    },
  });
}

export function useDeleteTrade() {
  return useMutation({
    mutationFn: async () => {
      console.log("Trade deletion not implemented yet");
    },
  });
}

export function useSeedSampleTrades() {
  return useMutation({
    mutationFn: async () => {
      console.log("Sample trades seeding not implemented yet");
    },
  });
}
