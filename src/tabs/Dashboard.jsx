import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useToast } from "../components/Toast";

const RANKS  = ["🥇","🥈","🥉","4️⃣","5️⃣"];
const WD     = ["อา","จ","อ","พ","พฤ","ศ","ส"];
const MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const fmt = n => (+(n||0)).toLocaleString();

function todayStr() {
  const d = new Date();
  return `${d.getDate()}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function buildCal(expRows, sfRows, stkRows) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const first = new Date(y,m,1).getDay();
  const days  = new Date(y,m+1,0).getDate();
  const map   = {};

  const ensure = d => { if (!map[d]) map[d] = { e:0, i:0, sf:0, stk:0 }; };

  (expRows||[]).forEach(r => {
    if (!r.date) return;
    const d = parseInt(r.date.split("/")[0], 10);
    ensure(d);
    r.type==="EXPENSE" ? (map[d].e += r.amount) : (map[d].i += r.amount);
  });
  (sfRows||[]).forEach(r => {
    if (!r.date) return;
    const d = parseInt(r.date.split("/")[0], 10);
    ensure(d);
    map[d].sf += (r.totalSales || r.cashIncome || 0);
  });
  (stkRows||[]).forEach(r => {
    if (!r.date) return;
    const d = parseInt(r.date.split("/")[0], 10);
    ensure(d);
    map[d].stk += 1;
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

function Skeleton() {
  return (
    <div>
      <div className="skeleton sk-hero" />
      <div className="sk-row">
        <div className="skeleton sk-card" /><div className="skeleton sk-card" /><div className="skeleton sk-card" />
      </div>
      <div className="skeleton sk-card" style={{height:200,marginBottom:14}} />
      <div className="sk-list">
        {[1,2,3,4].map(i=><div key={i} className="skeleton sk-item" />)}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleRename = async (uid) => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error("กรุณาใส่ชื่อ"); return; }
    setRenaming(true);
    try {
      await api.renameMember(uid, trimmed);
      toast.success("เปลี่ยนชื่อสำเร็จ");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['batch'] });
    } catch (e) { toast.error("เปลี่ยนชื่อไม่สำเร็จ: " + e.message); }
    finally { setRenaming(false); }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['batch', 30],
    queryFn: () => api.batch(30),
  });

  if (isLoading) return <Skeleton />;
  if (error) return (
    <div className="err">
      ❌ {error.message}
      <button className="btn-ghost" style={{marginTop:8}} onClick={()=>window.location.reload()}>ลองใหม่</button>
    </div>
  );

  const { dashboard: dash, leaderboard: lb_data, expense: exp_data, storefront: sf_data, stock: stk_data } = data;
  const lb      = lb_data?.leaderboard || [];
  const expRows = exp_data?.rows || [];
  const sfRows  = sf_data?.rows || [];
  const stkRows = stk_data?.rows || [];

  const { storefront:sf, daily:dl, stock:stk } = dash;

  // คำนวณจาก expense rows จริงถ้า Daily Summary ยังไม่มี
  const td = todayStr();
  const todayExp = expRows.filter(r => r.date === td);
  const computedIncome  = todayExp.filter(r=>r.type==="INCOME").reduce((s,r)=>s+r.amount, 0);
  const computedExpense = todayExp.filter(r=>r.type==="EXPENSE").reduce((s,r)=>s+r.amount, 0);

  const incomeTotal   = dl.found ? dl.incomeTotal   : computedIncome;
  const expenseTotal  = dl.found ? dl.expenseTotal  : computedExpense;
  const endingBalance = dl.found ? dl.endingBalance  : (computedIncome - computedExpense);

  // รวม 30 วัน
  const allIncome  = expRows.filter(r=>r.type==="INCOME").reduce((s,r)=>s+r.amount,0);
  const allExpense = expRows.filter(r=>r.type==="EXPENSE").reduce((s,r)=>s+r.amount,0);
  const allNet = allIncome - allExpense;

  // storefront: ใช้ totalSales จาก sf หรือคำนวณจาก sfRows
  const sfTotalSales = sf.totalSales || sfRows.reduce((s,r)=>s+(r.totalSales||0),0) / Math.max(sfRows.length,1) || 0;
  const sfCashBalance = sf.cashBalance || (sfRows.length > 0 ? sfRows[sfRows.length-1].cashBalance || 0 : 0);

  const { cells, map, today, month } = buildCal(expRows, sfRows, stkRows);
  const recent = expRows.slice(-6).reverse();

  return (
    <div>
      {/* Hero — แสดงยอดรวม 30 วัน */}
      <div className="hero-card">
        <div className="hero-label">ยอดสุทธิ 30 วัน</div>
        <div className="hero-amount" style={{color: allNet >= 0 ? "#A5F3C7" : "#FCA5A5"}}>
          {allNet >= 0 ? "+" : ""}{fmt(allNet)} ฿
        </div>
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
          <div className="wc-icon">💸</div>
          <div className="wc-label">รายจ่าย 30 วัน</div>
          <div className="wc-value c-red">{fmt(allExpense)} ฿</div>
        </div>
        <div className="wallet-card">
          <div className="wc-icon">💰</div>
          <div className="wc-label">รายรับ 30 วัน</div>
          <div className="wc-value c-green">{fmt(allIncome)} ฿</div>
        </div>
        <div className="wallet-card">
          <div className="wc-icon">🏪</div>
          <div className="wc-label">ยอดขายหน้าร้าน</div>
          <div className="wc-value">{fmt(sf.totalSales || sfRows.reduce((s,r)=>s+(r.totalSales||0),0))} ฿</div>
        </div>
      </div>

      {/* Metrics — วันนี้ */}
      <div className="sec-hd"><span className="sec-title">วันนี้ ({dash.date})</span></div>
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-label">รายจ่าย</div>
          <div className="metric-value c-red">{fmt(expenseTotal)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">รายรับ</div>
          <div className="metric-value c-green">{fmt(incomeTotal)} ฿</div>
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
          {cells.map((d,i) => {
            if (!d) return <div key={i} className="cal-cell" style={{background:"var(--gray-50)"}}/>;
            const info = map[d];
            return (
              <div key={i} className={"cal-cell"+(d===today?" today":"")}>
                <div className="cc-num">{d}</div>
                <div className="cc-bars">
                  {info?.e > 0  && <div className="cc-bar cc-bar-exp" title={`รายจ่าย ${fmt(info.e)}`}>{(info.e/1000).toFixed(1)}k</div>}
                  {info?.i > 0  && <div className="cc-bar cc-bar-inc" title={`รายรับ ${fmt(info.i)}`}>{(info.i/1000).toFixed(1)}k</div>}
                  {info?.sf > 0 && <div className="cc-bar cc-bar-sf"  title={`หน้าร้าน ${fmt(info.sf)}`}>{(info.sf/1000).toFixed(1)}k</div>}
                  {info?.stk > 0 && <div className="cc-bar cc-bar-stk" title={`สต็อก ${info.stk} รายการ`}>{info.stk}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="cal-legend">
        <span><span className="cc-leg cc-bar-exp"/> รายจ่าย</span>
        <span><span className="cc-leg cc-bar-inc"/> รายรับ</span>
        <span><span className="cc-leg cc-bar-sf"/> หน้าร้าน</span>
        <span><span className="cc-leg cc-bar-stk"/> สต็อก</span>
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
                <div className="tx-meta">{r.category} · {r.date}</div>
              </div>
              <div className="tx-right">
                <div className="tx-amount" style={{color:r.type==="INCOME"?"var(--green)":"var(--red)"}}>
                  {r.type==="INCOME"?"+":"-"}{fmt(r.amount)} ฿
                </div>
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
              {editing === r.uid ? (
                <span className="lb-name lb-edit-wrap">
                  <input className="lb-edit-input" value={editName} onChange={e=>setEditName(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter") handleRename(r.uid); if(e.key==="Escape") setEditing(null); }}
                    autoFocus disabled={renaming} />
                  <button className="btn-icon" onClick={()=>handleRename(r.uid)} disabled={renaming}>✓</button>
                  <button className="btn-icon" onClick={()=>setEditing(null)}>✕</button>
                </span>
              ) : (
                <span className="lb-name" onClick={()=>{ if(r.uid){ setEditing(r.uid); setEditName(r.name||""); }}}
                  style={{cursor: r.uid ? "pointer" : "default"}} title={r.uid ? "กดเพื่อแก้ชื่อ" : ""}>
                  {r.name} {r.uid && <span style={{fontSize:10,opacity:0.5}}>✏</span>}
                </span>
              )}
              <span className="lb-pts">{r.points.toLocaleString()} pt</span>
              <span className="lb-medal">{r.medals}🏅</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
