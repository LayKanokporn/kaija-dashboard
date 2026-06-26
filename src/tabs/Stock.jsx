import { useEffect, useState } from "react";
import { api } from "../api";

const TYPE = {
  RECEIVE: { label:"รับเข้า",  icon:"📥", bg:"var(--green-bg)",  c:"var(--green)"  },
  ISSUE:   { label:"เบิกใช้",  icon:"📤", bg:"var(--amber-bg)",  c:"var(--amber)"  },
  WASTE:   { label:"เสียหาย", icon:"🗑",  bg:"var(--red-bg)",    c:"var(--red)"    },
  ADJUST:  { label:"ปรับยอด", icon:"🔧",  bg:"var(--blue-bg)",   c:"var(--blue)"   },
};

export default function Stock() {
  const [rows, setRows]       = useState([]);
  const [days, setDays]       = useState(7);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true);
    api.stock(days).then(d=>setRows(d.rows||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [days]);

  const recv  = rows.filter(r=>r.movementType==="RECEIVE").length;
  const issue = rows.filter(r=>r.movementType==="ISSUE").length;
  const waste = rows.filter(r=>r.movementType==="WASTE").length;
  const visible = rows.filter(r=>filter==="all"||r.movementType===filter).slice().reverse();

  if (loading) return <div className="loading"/>;
  if (error)   return <div className="err">❌ {error}</div>;

  return (
    <div>
      <div className="metric-grid" style={{marginBottom:14}}>
        <div className="metric-card">
          <div className="metric-label">รับเข้า</div>
          <div className="metric-value c-green">{recv} ครั้ง</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">เบิกใช้</div>
          <div className="metric-value c-amber">{issue} ครั้ง</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">เสียหาย</div>
          <div className="metric-value c-red">{waste} ครั้ง</div>
        </div>
      </div>

      <div className="pill-row">
        {[["all","ทั้งหมด"],["RECEIVE","รับเข้า"],["ISSUE","เบิกใช้"],["WASTE","เสียหาย"]].map(([v,l])=>(
          <button key={v} className={"pill"+(filter===v?" active":"")} onClick={()=>setFilter(v)}>{l}</button>
        ))}
        <select className="select-sm" style={{marginLeft:"auto"}} value={days} onChange={e=>setDays(+e.target.value)}>
          <option value={7}>7 วัน</option><option value={14}>14 วัน</option><option value={30}>30 วัน</option>
        </select>
      </div>

      <div className="tx-list">
        {visible.length===0 ? <div className="empty">ไม่มีความเคลื่อนไหว</div>
          : visible.map((r,i)=>{
              const t = TYPE[r.movementType]||{label:r.movementType,icon:"📋",bg:"var(--gray-100)",c:"var(--gray-500)"};
              return (
                <div key={i} className="tx-item">
                  <div className="tx-avatar" style={{background:t.bg}}>{t.icon}</div>
                  <div className="tx-body">
                    <div className="tx-name">{r.itemName||"—"}</div>
                    <div className="tx-meta">{t.label}{r.note?" · "+r.note:""}</div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-amount" style={{color:t.c}}>{r.qty} {r.unit}</div>
                    <div className="tx-date">{r.date}</div>
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
