import { useEffect, useState } from "react";
import { api } from "../api";

const fmt = n => (+(n||0)).toLocaleString();
const CAT_ICON = {"วัตถุดิบ":"🥕","ค่าเดินทาง":"🚗","พัสดุ":"📦","สาธารณูปโภค":"💡","อาหาร":"🍱","สินค้า":"🛍","รายรับ":"💚","อื่นๆ":"📋"};
const icon = cat => { for(const k of Object.keys(CAT_ICON)) if(cat?.includes(k)) return CAT_ICON[k]; return "📋"; };

export default function Expense() {
  const [rows, setRows]       = useState([]);
  const [days, setDays]       = useState(7);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.expense(days).then(d=>setRows(d.rows||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [days]);

  const inc = rows.filter(r=>r.type==="INCOME").reduce((s,r)=>s+r.amount,0);
  const exp = rows.filter(r=>r.type==="EXPENSE").reduce((s,r)=>s+r.amount,0);
  const net = inc - exp;
  const visible = rows.filter(r=>filter==="all"||(filter==="income"?r.type==="INCOME":r.type==="EXPENSE")).slice().reverse();

  if (loading) return <div className="loading"/>;
  if (error)   return <div className="err">❌ {error}</div>;

  return (
    <div>
      <div className="hero-card" style={{marginBottom:14}}>
        <div className="hero-label">ยอดสุทธิ {days} วัน</div>
        <div className="hero-amount" style={{color:net>=0?"#A5F3C7":"#FCA5A5"}}>
          {net>=0?"+":""}{fmt(net)} ฿
        </div>
      </div>

      <div className="metric-grid" style={{marginBottom:14}}>
        <div className="metric-card">
          <div className="metric-label">รายจ่าย</div>
          <div className="metric-value c-red">{fmt(exp)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">รายรับ</div>
          <div className="metric-value c-green">{fmt(inc)} ฿</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">รายการ</div>
          <div className="metric-value c-brand">{rows.length}</div>
        </div>
      </div>

      <div className="pill-row">
        {[["all","ทั้งหมด"],["income","รายรับ"],["expense","รายจ่าย"]].map(([v,l])=>(
          <button key={v} className={"pill"+(filter===v?" active":"")} onClick={()=>setFilter(v)}>{l}</button>
        ))}
        <select className="select-sm" style={{marginLeft:"auto"}} value={days} onChange={e=>setDays(+e.target.value)}>
          <option value={7}>7 วัน</option><option value={14}>14 วัน</option><option value={30}>30 วัน</option>
        </select>
      </div>

      <div className="tx-list">
        {visible.length===0 ? <div className="empty">ไม่มีข้อมูล</div>
          : visible.map((r,i)=>(
            <div key={i} className="tx-item">
              <div className="tx-avatar" style={{background:r.type==="INCOME"?"var(--green-bg)":"var(--red-bg)"}}>
                {icon(r.category)}
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
    </div>
  );
}
