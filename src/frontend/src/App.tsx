import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { motion } from "motion/react";
import { createContext, useContext, useState } from "react";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { BtcChart } from "./components/BtcChart";
import { Footer } from "./components/Footer";
import { MarketWatch } from "./components/MarketWatch";
import { TopNav } from "./components/TopNav";
import { TradesTable } from "./components/TradesTable";
import { TradingStatsPanel } from "./components/TradingStats";
import { useIsMobile } from "./hooks/use-mobile";

// Trading Terminal v72 — Clean rebuild: branch conflict fix, live=draft sync

export type AssetSymbol =
  | "BTC/USD_LEVERAGE"
  | "ETH/USD_LEVERAGE"
  | "XRP/USD_LEVERAGE"
  | "BNB/USD";

// ── Shared context so child routes can read/write symbol & search ──────────────
interface AppContextValue {
  selectedSymbol: AssetSymbol;
  setSelectedSymbol: (s: AssetSymbol) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const AppContext = createContext<AppContextValue>({
  selectedSymbol: "BTC/USD_LEVERAGE",
  setSelectedSymbol: () => {},
  searchQuery: "",
  setSearchQuery: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

// ── Root layout component (TopNav + Outlet + Footer) ──────────────────────────
function RootLayout() {
  const [selectedSymbol, setSelectedSymbol] =
    useState<AssetSymbol>("BTC/USD_LEVERAGE");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppContext.Provider
      value={{ selectedSymbol, setSelectedSymbol, searchQuery, setSearchQuery }}
    >
      <div className="min-h-screen flex flex-col" data-ocid="dashboard.page">
        <TopNav searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        <main className="flex-1 px-3 sm:px-4 md:px-6 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
        <Footer />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.168 0.020 240)",
              border: "1px solid oklch(1 0 0 / 0.12)",
              color: "oklch(0.910 0.015 240)",
            },
          }}
        />
      </div>
    </AppContext.Provider>
  );
}

// ── Page components ────────────────────────────────────────────────────────────
function DashboardPage() {
  const { selectedSymbol, setSelectedSymbol, searchQuery } = useAppContext();
  const isMobile = useIsMobile(1024);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="mb-4">
        {isMobile ? (
          <div className="flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
              data-ocid="market.panel"
            >
              <MarketWatch
                compact
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                searchQuery={searchQuery}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              data-ocid="chart.panel"
              style={{ minHeight: "440px" }}
            >
              <BtcChart symbol={selectedSymbol} />
            </motion.div>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4"
            style={{ minHeight: "540px" }}
          >
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
              data-ocid="market.panel"
            >
              <MarketWatch
                selectedSymbol={selectedSymbol}
                onSelectSymbol={setSelectedSymbol}
                searchQuery={searchQuery}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              data-ocid="chart.panel"
            >
              <BtcChart symbol={selectedSymbol} />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AnalysisPage() {
  return (
    <motion.div
      key="analysis"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <AnalysisPanel />
    </motion.div>
  );
}

function TradingPage() {
  return (
    <motion.div
      key="trading"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      data-ocid="stats.panel"
    >
      <TradingStatsPanel />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
        className="mt-6"
        data-ocid="trades.panel"
      >
        <TradesTable />
      </motion.div>
    </motion.div>
  );
}

// ── Router definition ──────────────────────────────────────────────────────────
const rootRoute = createRootRoute({ component: RootLayout });

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
});

const analysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analysis",
  component: AnalysisPage,
});

const tradingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trading",
  component: TradingPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  analysisRoute,
  tradingRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── App shell ──────────────────────────────────────────────────────────────────
function App() {
  return <RouterProvider router={router} />;
}

export default App;
