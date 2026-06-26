import { useEffect, useState } from "react";
import { api } from "../api";

const RANKS  = ["🥇","🥈","🥉","4️⃣","5️⃣"];
const WD     = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

const fmt = n => (+(n||0)).toLocaleString();

function buildCal(rows) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const first = new Date(y,m,1).getDay();
  const days  = new Date(y,m+1,0).getDate();
  const map   = {};
  (rows||[]).forEach(r => {
    if (!r.date) return;
    const d = parseInt(r.date.split("/")[0], 10);
    if (!map[d]) map[d] = {e:0,i:0};
    r.type==="EXPENSE" ? (map[d].e+=r.amount) : (map[d].i+=r.amount);
  });
  return {
    cells: [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)],
    map, today, month: m
  };
}

function StatusTag({ found, status, label }) {
  const cls = !found ? "miss" : status==="warn" ? "warn" : "ok";
  const txt = !found ? "ยังไม่ส่ง" : status==="warn" ? "ตรวจสอบ" : "✓ ส่งแล้ว";
  return <span className={`hero-tag ${cls}`}>{label} {txt}</span>;
}

export default function Dashboard() {
  const [dash, setDash]       = useState(null);
  const [lb, setLb]           = useState([]);
  const [expRows, setExpRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.leaderboard(), api.expense(30)])
      .then(([d,l,e]) => { setDash(d); setLb(l.leaderboard||[]); setExpRows(e.rows||[]); })
      .catch(ex => setError(ex.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading" />;
  if (error)   return <div className="err">❌ {error}</div>;

  const { storefront:sf, daily:dl, stock:stk } = dash;
  const { cells, map, today, month } = buildCal(expRows);
  const recent = expRows.slice(-6).reverse();

  return (
    <div>
      {/* Hero */}
      <div className="hero-card">
        <div className="hero-label">ยอดคงเหลือวันนี้</div>
        <div className="hero-amount">{fmt(dl.endingBalance)} ฿</div>
        <div className="hero-sub">{dash.date}</div>
        <div className="hero-tags">
          <StatusTag found={sf.found} status={sf.status} label="🏪 หน้าร้าน" />
          <StatusTag found={dl.found} status={dl.status} label="💰 รายรับ-จ่าย" />
          {stk.lowCount > 0 && <span className="hero-tag warn">⚠ ใกล้หมด {stk.lowCount} รายการ</span>}
        </div>
      </div>

      {/* Wallet */}
      <div className="wallet-row">
        <div className="wallet-card">
          <div className="wc-icon">🏪</div>
          <div className="wc-label">เงินสดหน้าร้าน</div>
          <div className="wc-value">{fmt(sf.cashBalance)} ฿</div>
        </div>
        <div className="wallet-card">
          <div className="wc-icon">💰</div>
          <div className="wc-label">รายรับวันนี้</div>
          <div className="wc-value c-green">{fmt(dl.incomeTotal)} ฿</div>
        </div>
        <div className="wallet-card">
          <div className="wc-icon">🛍</div>
          <div className="wc-label">ยอดขายหน้าร้าน</div>
          <div className="wc-value">{fmt(sf.totalSales)} ฿</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">รายจ่าย</div>
          <div className="metric-value c-red">{fmt(dl.expenseTotal)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">รายรับ</div>
          <div className="metric-value c-green">{fmt(dl.incomeTotal)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">สต็อกวันนี้</div>
          <div className="metric-value c-blue">{stk.txCount} รายการ</div>
          <div className="metric-sub">รับ {stk.recv} · เบิก {stk.issue}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="sec-hd"><span className="sec-title">ปฏิทิน</span><span className="sec-note">{MONTHS[month]}</span></div>
      <div className="calendar">
        <div className="cal-wd-row">{WD.map(d=><div key={d} className="cal-wd">{d}</div>)}</div>
        <div className="cal-body">
          {cells.map((d,i) => !d
            ? <div key={i} className="cal-cell" style={{background:"var(--gray-50)"}}/>
            : <div key={i} className={"cal-cell"+(d===today?" today":"")}>
                <div className="cc-num">{d}</div>
                {map[d]?.e>0 && <div className="cc-exp">{(map[d].e/1000).toFixed(1)}k</div>}
                {map[d]?.i>0 && <div className="cc-inc">{(map[d].i/1000).toFixed(1)}k</div>}
              </div>
          )}
        </div>
      </div>

      {/* Recent */}
      <div className="sec-hd" style={{marginTop:16,marginBottom:10}}>
        <span className="sec-title">ธุรกรรมล่าสุด</span>
      </div>
      <div className="tx-list" style={{marginBottom:20}}>
        {recent.length===0
          ? <div className="empty">ไม่มีรายการ</div>
          : recent.map((r,i)=>(
            <div key={i} className="tx-item">
              <div className="tx-avatar" style={{background:r.type==="INCOME"?"var(--green-bg)":"var(--red-bg)"}}>
                {r.type==="INCOME"?"💚":"🛍"}
              </div>
              <div className="tx-body">
                <div className="tx-name">{r.note||r.category||"รายการ"}</div>
                <div className="tx-meta">{r.category}</div>
              </div>
              <div className="tx-right">
                <div className="tx-amount" style={{color:r.type==="INCOME"?"var(--green)":"var(--red)"}}>
                  {r.type==="INCOME"?"+":"-"}{fmt(r.amount)} ฿
                </div>
                <div className="tx-date">{r.date}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Leaderboard */}
      <div className="sec-hd" style={{marginBottom:10}}><span className="sec-title">🏆 อันดับคะแนน</span></div>
      <div className="lb-list">
        {lb.length===0
          ? <div className="empty">ยังไม่มีข้อมูลคะแนน</div>
          : lb.map((r,i)=>(
            <div key={i} className="lb-row">
              <span className="lb-rank">{RANKS[i]||r.rank}</span>
              <div className="lb-av">{(r.name||"?")[0].toUpperCase()}</div>
              <span className="lb-name">{r.name}</span>
              <span className="lb-pts">{r.points.toLocaleString()} pt</span>
              <span className="lb-medal">{r.medals}🏅</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
