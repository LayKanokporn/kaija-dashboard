import { useState, useMemo, useCallback, createContext, useContext } from "react";
import Dashboard from "./tabs/Dashboard";
import Expense from "./tabs/Expense";
import Storefront from "./tabs/Storefront";
import Stock from "./tabs/Stock";
import { api } from "./api";
import "./App.css";

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

// context ให้ tabs เรียก refresh ได้
export const RefreshCtx = createContext({ key:0, refresh:()=>{} });

export default function App() {
  const [tab, setTab]         = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const [spinning, setSpinning]     = useState(false);
  const [mounted, setMounted] = useState(() => new Set(["dashboard"]));
  const loadedAt = useMemo(() => fmtThaiDateTime(new Date()), []);
  const cur = TABS.find(t => t.id === tab);

  const handleTabChange = (id) => {
    setTab(id);
    setMounted(prev => new Set([...prev, id]));
  };

  const handleRefresh = useCallback(async () => {
    setSpinning(true);
    api.clearCache();
    setRefreshKey(k => k + 1);
    await new Promise(r => setTimeout(r, 700)); // อย่างน้อย 1 รอบ animation
    setSpinning(false);
  }, []);

  return (
    <RefreshCtx.Provider value={{ key: refreshKey }}>
      <div className="app-shell">
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
            <button className={"btn-refresh" + (spinning ? " spinning" : "")} onClick={handleRefresh} title="รีเฟรชข้อมูล">↻</button>
          </div>
        </nav>

        <div className="main-content">
          <div className="topbar">
            <div className="topbar-icon">{cur.icon}</div>
            <div style={{flex:1}}>
              <div className="topbar-title">{cur.label}</div>
              <div className="topbar-sub">Sunrise Cake Cafe</div>
            </div>
            <button className={"btn-refresh" + (spinning ? " spinning" : "")} onClick={handleRefresh} title="รีเฟรชข้อมูล">↻</button>
          </div>
          <div className="page">
            {mounted.has("dashboard")  && <div style={{display: tab==="dashboard"  ? "block":"none"}}><Dashboard /></div>}
            {mounted.has("expense")    && <div style={{display: tab==="expense"    ? "block":"none"}}><Expense /></div>}
            {mounted.has("storefront") && <div style={{display: tab==="storefront" ? "block":"none"}}><Storefront /></div>}
            {mounted.has("stock")      && <div style={{display: tab==="stock"      ? "block":"none"}}><Stock /></div>}
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
    </RefreshCtx.Provider>
  );
}
