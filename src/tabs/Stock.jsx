import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

const TYPE = {
  RECEIVE: { label:"รับเข้า",  icon:"📥", bg:"var(--green-bg)",  c:"var(--green)"  },
  ISSUE:   { label:"เบิกใช้",  icon:"📤", bg:"var(--amber-bg)",  c:"var(--amber)"  },
  WASTE:   { label:"เสียหาย", icon:"🗑",  bg:"var(--red-bg)",    c:"var(--red)"    },
  ADJUST:  { label:"ปรับยอด", icon:"🔧",  bg:"var(--blue-bg)",   c:"var(--blue)"   },
};
const EMPTY_FORM = { txDate:"", movementType:"RECEIVE", itemName:"", qty:"", unit:"", note:"" };

export default function Stock() {
  const qc = useQueryClient();
  const toast = useToast();
  const [days, setDays]       = useState(7);
  const [filter, setFilter]   = useState("all");
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['stock', days],
    queryFn: () => api.stock(days),
  });
  const rows = data?.rows || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['stock'] });
    qc.invalidateQueries({ queryKey: ['batch'] });
  };

  const recv  = rows.filter(r=>r.movementType==="RECEIVE").length;
  const issue = rows.filter(r=>r.movementType==="ISSUE").length;
  const waste = rows.filter(r=>r.movementType==="WASTE").length;
  const visible = rows.filter(r=>filter==="all"||r.movementType===filter).slice().reverse();

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, txDate: new Date().toLocaleDateString("en-CA") });
    setModal({ mode:"add" });
  };
  const openEdit = row => {
    setForm({ txDate:row.date, movementType:row.movementType, itemName:row.itemName||"", qty:String(row.qty||""), unit:row.unit||"", note:row.note||"" });
    setModal({ mode:"edit", row });
  };
  const handleSave = async () => {
    if (!form.itemName) { toast.error("กรุณาใส่ชื่อสินค้า"); return; }
    if (!form.qty || isNaN(+form.qty)) { toast.error("กรุณาใส่จำนวน"); return; }
    setSaving(true);
    try {
      const p = { txDate:form.txDate, movementType:form.movementType, itemName:form.itemName, qty:form.qty, unit:form.unit, note:form.note };
      if (modal.mode === "add") { await api.addStock(p); toast.success("เพิ่มรายการสำเร็จ"); }
      else { await api.updateStock({ ...p, rowIndex:modal.row.rowIndex }); toast.success("แก้ไขสำเร็จ"); }
      setModal(null);
      invalidate();
    } catch(e) { toast.error("บันทึกไม่สำเร็จ: " + e.message); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    const row = deleting;
    try { await api.deleteStock(row.rowIndex); invalidate(); toast.success("ลบสำเร็จ"); }
    catch(e) { toast.error("ลบไม่สำเร็จ: " + e.message); }
    finally { setDeleting(null); }
  };

  if (isLoading) return <div><div className="sk-row"><div className="skeleton sk-card" /><div className="skeleton sk-card" /><div className="skeleton sk-card" /></div><div className="sk-list">{[1,2,3,4].map(i=><div key={i} className="skeleton sk-item" />)}</div></div>;
  if (error)     return <div className="err">❌ {error.message}</div>;

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
        <button className="btn-add" onClick={openAdd}>+ เพิ่ม</button>
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
                    <div className="tx-meta">{t.label} · {r.date}{r.note?" · "+r.note:""}</div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-amount" style={{color:t.c}}>{r.qty} {r.unit}</div>
                  </div>
                  <div className="tx-actions">
                    <button className="btn-icon btn-edit" title="แก้ไข" onClick={()=>openEdit(r)}>✏</button>
                    <button className="btn-icon btn-del"  title="ลบ"    onClick={()=>setDeleting(r)}>✕</button>
                  </div>
                </div>
              );
            })
        }
      </div>

      {deleting && (
        <ConfirmDialog
          title="ยืนยันการลบ"
          message={`ลบ "${deleting.itemName}" ${deleting.qty} ${deleting.unit} ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

      {modal && (
        <Modal title={modal.mode==="add"?"เพิ่มรายการสต็อก":"แก้ไขรายการสต็อก"} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          <div className="field"><label>วันที่</label>
            <input type="date" value={form.txDate} onChange={e=>setForm({...form,txDate:e.target.value})} />
          </div>
          <div className="field"><label>ประเภท</label>
            <select value={form.movementType} onChange={e=>setForm({...form,movementType:e.target.value})}>
              <option value="RECEIVE">รับเข้า</option>
              <option value="ISSUE">เบิกใช้</option>
              <option value="WASTE">เสียหาย</option>
              <option value="ADJUST">ปรับยอด</option>
            </select>
          </div>
          <div className="field"><label>ชื่อสินค้า</label>
            <input placeholder="เช่น แป้ง, เนย, น้ำตาล" value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} />
          </div>
          <div className="field"><label>จำนวน</label>
            <input type="number" min="0" step="0.01" placeholder="0" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} />
          </div>
          <div className="field"><label>หน่วย</label>
            <input placeholder="กก., กล่อง, ชิ้น…" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} />
          </div>
          <div className="field"><label>หมายเหตุ</label>
            <input placeholder="หมายเหตุ (ถ้ามี)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
          </div>
        </Modal>
      )}
    </div>
  );
}
