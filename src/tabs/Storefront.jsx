import { useEffect, useState } from "react";
import { api } from "../api";

const fmt = n => (+(n||0)).toLocaleString();

export default function Storefront() {
  const [rows, setRows]       = useState([]);
  const [days, setDays]       = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.storefront(days).then(d=>setRows(d.rows||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [days]);

  const totSales    = rows.reduce((s,r)=>s+(r.totalSales||0),0);
  const totTransfer = rows.reduce((s,r)=>s+(r.transferIncome||0),0);
  const totCash     = rows.reduce((s,r)=>s+(r.cashIncome||0),0);
  const totExp      = rows.reduce((s,r)=>s+(r.cashExpense||0),0);

  if (loading) return <div className="loading"/>;
  if (error)   return <div className="err">❌ {error}</div>;

  return (
    <div>
      <div className="hero-card" style={{marginBottom:14}}>
        <div className="hero-label">ยอดขายรวม {days} วัน</div>
        <div className="hero-amount">{fmt(totSales)} ฿</div>
        <div className="hero-sub">สด {fmt(totCash)} · โอน {fmt(totTransfer)} ฿</div>
      </div>

      <div className="metric-grid" style={{marginBottom:14}}>
        <div className="metric-card">
          <div className="metric-label">เงินสดรับ</div>
          <div className="metric-value c-green">{fmt(totCash)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">โอน</div>
          <div className="metric-value c-blue">{fmt(totTransfer)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">รายจ่าย</div>
          <div className="metric-value c-red">{fmt(totExp)} ฿</div>
        </div>
      </div>

      <div className="sec-hd" style={{marginBottom:10}}>
        <span className="sec-title">รายวัน</span>
        <select className="select-sm" value={days} onChange={e=>setDays(+e.target.value)}>
          <option value={7}>7 วัน</option><option value={14}>14 วัน</option><option value={30}>30 วัน</option>
        </select>
      </div>

      <div className="tx-list">
        {rows.length===0 ? <div className="empty">ไม่มีข้อมูล</div>
          : rows.slice().reverse().map((r,i)=>(
            <div key={i} className="tx-item">
              <div className="tx-avatar" style={{background:"var(--green-bg)"}}>🏪</div>
              <div className="tx-body">
                <div className="tx-name">{r.date}</div>
                <div className="tx-meta">สด {fmt(r.cashIncome)} · โอน {fmt(r.transferIncome)} · จ่าย {fmt(r.cashExpense)} ฿</div>
              </div>
              <div className="tx-right">
                <div className="tx-amount c-green">{fmt(r.totalSales)} ฿</div>
                <div className="tx-date">เหลือ {fmt(r.cashBalance)}</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
