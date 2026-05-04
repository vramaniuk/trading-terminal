// ---- Colors ----
export const C_GREEN = "oklch(0.723 0.185 150)";
export const C_RED = "oklch(0.637 0.220 25)";
export const C_YELLOW = "oklch(0.820 0.160 90)";
export const C_CYAN = "oklch(0.785 0.135 200)";
export const C_DIM = "oklch(0.450 0.015 240)";
export const C_MID = "oklch(0.500 0.015 240)";
export const C_FG = "oklch(0.910 0.015 240)";

// ---- Shared card background style ----
export const CARD_STYLE: React.CSSProperties = {
  background: "oklch(0.155 0.020 240)",
  border: "1px solid oklch(1 0 0 / 0.08)",
};

// ---- Stablecoin exclusion set ----
export const STABLECOINS = new Set([
  "USDT", "USDC", "TUSD", "PAXUSD", "DAI", "FRAX", "LUSD", "USDP",
  "USDD", "GUSD", "GBPT", "EURS", "BUSD", "USDM", "FDUSD", "UST",
  "USTC", "SUSD", "HUSD", "XAUT", "PAXG", "USDS", "CRVUSD", "PYUSD",
  "USDE", "FXUSD", "USDX", "EURC", "USDK", "USDH", "AEUR", "XIDR", "IDRT",
]);
