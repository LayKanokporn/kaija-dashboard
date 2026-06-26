import { useState } from "react";
import Dashboard from "./tabs/Dashboard";
import Expense from "./tabs/Expense";
import Storefront from "./tabs/Storefront";
import Stock from "./tabs/Stock";
import "./App.css";

const TABS = [
  { id: "dashboard",  icon: "📊", label: "ภาพรวม" },
  { id: "expense",    icon: "💰", label: "รายรับ-จ่าย" },
  { id: "storefront", icon: "🏪", label: "หน้าร้าน" },
  { id: "stock",      icon: "📦", label: "สต็อก" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const cur = TABS.find(t => t.id === tab);

  return (
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
          <button key={t.id} className={"sidebar-item" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            <span className="s-icon">{t.icon}</span>{t.label}
          </button>
        ))}
        <div className="sidebar-footer">v2.8 · ระบบไก่จ๋า</div>
      </nav>

      <div className="main-content">
        <div className="topbar">
          <div className="topbar-icon">{cur.icon}</div>
          <div>
            <div className="topbar-title">{cur.label}</div>
            <div className="topbar-sub">Sunrise Cake Cafe</div>
          </div>
        </div>
        <div className="page">
          {tab === "dashboard"  && <Dashboard />}
          {tab === "expense"    && <Expense />}
          {tab === "storefront" && <Storefront />}
          {tab === "stock"      && <Stock />}
        </div>
      </div>

      <nav className="bottom-nav">
        {TABS.map(t => (
          <button key={t.id} className={"nav-item" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
