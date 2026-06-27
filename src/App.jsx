import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider, useQueryClient, useIsFetching } from "@tanstack/react-query";
import Dashboard from "./tabs/Dashboard";
import "./App.css";

// Expense/Storefront/Stock โหลดแค่ตอนคลิกครั้งแรก (code splitting)
const Expense    = lazy(() => import("./tabs/Expense"));
const Storefront = lazy(() => import("./tabs/Storefront"));
const Stock      = lazy(() => import("./tabs/Stock"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000,      // data ถือว่า fresh 3 นาที
      gcTime:    10 * 60 * 1000,     // เก็บ cache ไว้ 10 นาที
      retry: 1,
      refetchOnWindowFocus: false,   // ไม่ refetch ตอน switch tab browser
    }
  }
});

const TABS = [
  { id: "dashboard",  icon: "📊", label: "ภาพรวม" },
  { id: "expense",    icon: "💰", label: "รายรับ-จ่าย" },
  { id: "storefront", icon: "🏪", label: "หน้าร้าน" },
  { id: "stock",      icon: "📦", label: "สต็อก" },
];

function fmtThaiDateTime(d) {
  const day  = d.toLocaleDateString("th-TH", { day:"numeric", month:"short", year:"numeric" });
  const time = d.toLocaleTimeString("th-TH", { hour:"2-digit", minute:"2-digit" });
  return `${day} ${time}`;
}

function TabSkeleton() {
  return (
    <div>
      <div className="skeleton sk-hero" />
      <div className="sk-row">
        <div className="skeleton sk-card" /><div className="skeleton sk-card" /><div className="skeleton sk-card" />
      </div>
      <div className="sk-list">
        {[1,2,3,4].map(i => <div key={i} className="skeleton sk-item" />)}
      </div>
    </div>
  );
}

function AppInner() {
  const qc = useQueryClient();
  const fetching = useIsFetching();
  const [tab, setTab]           = useState("dashboard");
  const [spinning, setSpinning] = useState(false);
  const [mounted, setMounted]   = useState(() => new Set(["dashboard"]));
  const loadedAt = useMemo(() => fmtThaiDateTime(new Date()), []);
  const cur = TABS.find(t => t.id === tab);

  const handleTabChange = (id) => {
    setTab(id);
    setMounted(prev => new Set([...prev, id]));
  };

  const handleRefresh = useCallback(async () => {
    setSpinning(true);
    await qc.invalidateQueries();
    await new Promise(r => setTimeout(r, 600));
    setSpinning(false);
  }, [qc]);

  const isBusy = spinning || fetching > 0;

  return (
    <div className="app-shell">
      {/* fetch progress bar */}
      {fetching > 0 && <div className="fetch-bar" />}

      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-box">🐔</div>
          <div>
            <div className="logo-text">ไก่จ๋า</div>
            <div className="logo-sub">Sunrise Cake Cafe</div>
          </div>
        </div>
        <div className="nav-section">เมนูหลัก</div>
        {TABS.map(t => (
          <button key={t.id} className={"sidebar-item" + (tab === t.id ? " active" : "")} onClick={() => handleTabChange(t.id)}>
            <span className="s-icon">{t.icon}</span>{t.label}
          </button>
        ))}
        <div className="sidebar-footer-row">
          <div className="sidebar-footer">{loadedAt} · ไก่จ๋า</div>
          <button className={"btn-refresh" + (isBusy ? " spinning" : "")} onClick={handleRefresh} title="รีเฟรชข้อมูล">↻</button>
        </div>
      </nav>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-icon">{cur.icon}</div>
          <div style={{flex:1}}>
            <div className="topbar-title">{cur.label}</div>
            <div className="topbar-sub">Sunrise Cake Cafe</div>
          </div>
          <button className={"btn-refresh" + (isBusy ? " spinning" : "")} onClick={handleRefresh} title="รีเฟรชข้อมูล">↻</button>
        </div>
        <div className="page">
          {mounted.has("dashboard")  && <div style={{display: tab==="dashboard"  ? "block":"none"}}><Dashboard /></div>}
          <Suspense fallback={<TabSkeleton />}>
            {mounted.has("expense")    && <div style={{display: tab==="expense"    ? "block":"none"}}><Expense /></div>}
            {mounted.has("storefront") && <div style={{display: tab==="storefront" ? "block":"none"}}><Storefront /></div>}
            {mounted.has("stock")      && <div style={{display: tab==="stock"      ? "block":"none"}}><Stock /></div>}
          </Suspense>
        </div>
      </div>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={"nav-item" + (tab === t.id ? " active" : "")} onClick={() => handleTabChange(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
            {tab === t.id && <span className="nav-dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
