import { useEffect, useState, useContext } from "react";
import { api } from "../api";
import Modal from "../components/Modal";
import { RefreshCtx } from "../App";

const fmt = n => (+(n||0)).toLocaleString();
const EMPTY_FORM = { txDate:"", cashForward:"0", cashIncome:"0", cashExpense:"0", transferIncome:"0" };

export default function Storefront() {
  const [rows, setRows]       = useState([]);
  const [days, setDays]       = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const { key } = useContext(RefreshCtx);
  const load = () => {
    setLoading(true);
    api.storefront(days).then(d => setRows(d.rows||[])).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(load, [days, key]);

  const totSales    = rows.reduce((s,r)=>s+(r.totalSales||0),0);
  const totTransfer = rows.reduce((s,r)=>s+(r.transferIncome||0),0);
  const totCash     = rows.reduce((s,r)=>s+(r.cashIncome||0),0);
  const totExp      = rows.reduce((s,r)=>s+(r.cashExpense||0),0);

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, txDate: new Date().toLocaleDateString("en-CA") });
    setModal({ mode:"add" });
  };
  const openEdit = row => {
    setForm({ txDate:row.date, cashForward:String(row.cashForward||0), cashIncome:String(row.cashIncome||0), cashExpense:String(row.cashExpense||0), transferIncome:String(row.transferIncome||0) });
    setModal({ mode:"edit", row });
  };
  const handleSave = async () => {
    setSaving(true);
    const cf = parseFloat(form.cashForward)||0, ci = parseFloat(form.cashIncome)||0;
    const ce = parseFloat(form.cashExpense)||0, ti = parseFloat(form.transferIncome)||0;
    try {
      const p = { txDate:form.txDate, cashForward:cf, cashIncome:ci, cashExpense:ce, transferIncome:ti, cashBalance:cf+ci-ce, totalSales:ci+ti };
      if (modal.mode === "add") { await api.addStorefront(p); }
      else { await api.updateStorefront({ ...p, rowIndex:modal.row.rowIndex }); }
      setModal(null); load();
    } catch(e) { alert("บันทึกไม่สำเร็จ: " + e.message); }
    finally { setSaving(false); }
  };
  const handleDelete = async row => {
    if (!confirm(`ลบข้อมูลหน้าร้านวันที่ ${row.date} ?`)) return;
    try { await api.deleteStorefront(row.rowIndex); load(); }
    catch(e) { alert("ลบไม่สำเร็จ: " + e.message); }
  };

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
        <button className="btn-add" onClick={openAdd}>+ เพิ่ม</button>
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
              <div className="tx-actions">
                <button className="btn-icon btn-edit" title="แก้ไข" onClick={()=>openEdit(r)}>✏</button>
                <button className="btn-icon btn-del"  title="ลบ"    onClick={()=>handleDelete(r)}>✕</button>
              </div>
            </div>
          ))
        }
      </div>

      {modal && (
        <Modal title={modal.mode==="add"?"เพิ่มยอดหน้าร้าน":"แก้ไขยอดหน้าร้าน"} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          <div className="field"><label>วันที่</label>
            <input type="date" value={form.txDate} onChange={e=>setForm({...form,txDate:e.target.value})} />
          </div>
          <div className="field"><label>เงินสดยกมา (฿)</label>
            <input type="number" min="0" step="1" value={form.cashForward} onChange={e=>setForm({...form,cashForward:e.target.value})} />
          </div>
          <div className="field"><label>เงินสดรับ (฿)</label>
            <input type="number" min="0" step="1" value={form.cashIncome} onChange={e=>setForm({...form,cashIncome:e.target.value})} />
          </div>
          <div className="field"><label>เงินโอนรับ (฿)</label>
            <input type="number" min="0" step="1" value={form.transferIncome} onChange={e=>setForm({...form,transferIncome:e.target.value})} />
          </div>
          <div className="field"><label>รายจ่าย (฿)</label>
            <input type="number" min="0" step="1" value={form.cashExpense} onChange={e=>setForm({...form,cashExpense:e.target.value})} />
          </div>
        </Modal>
      )}
    </div>
  );
}
