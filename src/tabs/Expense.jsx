import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import Modal from "../components/Modal";

const fmt = n => (+(n||0)).toLocaleString();
const CAT_ICON = {"วัตถุดิบ":"🥕","ค่าเดินทาง":"🚗","พัสดุ":"📦","สาธารณูปโภค":"💡","อาหาร":"🍱","สินค้า":"🛍","รายรับ":"💚","อื่นๆ":"📋"};
const icon = cat => { for(const k of Object.keys(CAT_ICON)) if(cat?.includes(k)) return CAT_ICON[k]; return "📋"; };
const CATS = ["วัตถุดิบ","ค่าเดินทาง","พัสดุ","สาธารณูปโภค","อาหาร","สินค้า","อื่นๆ"];
const EMPTY_FORM = { txDate:"", type:"EXPENSE", category:"อื่นๆ", itemName:"", amount:"", note:"" };

export default function Expense() {
  const qc = useQueryClient();
  const [days, setDays]     = useState(7);
  const [filter, setFilter] = useState("all");
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['expense', days],
    queryFn: () => api.expense(days),
  });
  const rows = data?.rows || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['expense'] });
    qc.invalidateQueries({ queryKey: ['batch'] });
  };

  const inc = rows.filter(r=>r.type==="INCOME").reduce((s,r)=>s+r.amount,0);
  const exp = rows.filter(r=>r.type==="EXPENSE").reduce((s,r)=>s+r.amount,0);
  const net = inc - exp;
  const visible = rows.filter(r=>filter==="all"||(filter==="income"?r.type==="INCOME":r.type==="EXPENSE")).slice().reverse();

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, txDate: new Date().toLocaleDateString("en-CA") });
    setModal({ mode:"add" });
  };
  const openEdit = row => {
    setForm({ txDate:row.date, type:row.type, category:row.category, itemName:row.itemName||"", amount:String(row.amount), note:row.note||"" });
    setModal({ mode:"edit", row });
  };
  const handleSave = async () => {
    if (!form.amount || isNaN(+form.amount)) { alert("กรุณาใส่จำนวนเงิน"); return; }
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await api.addExpense({ txDate:form.txDate, type:form.type, category:form.category, itemName:form.itemName||form.category, amount:form.amount, note:form.note });
      } else {
        await api.updateExpense({ rowIndex:modal.row.rowIndex, txDate:form.txDate, type:form.type, category:form.category, itemName:form.itemName, amount:form.amount, note:form.note });
      }
      setModal(null);
      invalidate();
    } catch(e) { alert("บันทึกไม่สำเร็จ: " + e.message); }
    finally { setSaving(false); }
  };
  const handleDelete = async row => {
    if (!confirm(`ลบ "${row.itemName||row.category}" ${fmt(row.amount)} ฿ ?`)) return;
    try { await api.deleteExpense(row.rowIndex); invalidate(); }
    catch(e) { alert("ลบไม่สำเร็จ: " + e.message); }
  };

  if (isLoading) return <div className="loading"/>;
  if (error)     return <div className="err">❌ {error.message}</div>;

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
        <button className="btn-add" onClick={openAdd}>+ เพิ่ม</button>
      </div>

      <div className="tx-list">
        {visible.length===0 ? <div className="empty">ไม่มีข้อมูล</div>
          : visible.map((r,i)=>(
            <div key={i} className="tx-item">
              <div className="tx-avatar" style={{background:r.type==="INCOME"?"var(--green-bg)":"var(--red-bg)"}}>
                {icon(r.category)}
              </div>
              <div className="tx-body">
                <div className="tx-name">{r.itemName||r.note||r.category||"รายการ"}</div>
                <div className="tx-meta">{r.category} · {r.date}</div>
              </div>
              <div className="tx-right">
                <div className="tx-amount" style={{color:r.type==="INCOME"?"var(--green)":"var(--red)"}}>
                  {r.type==="INCOME"?"+":"-"}{fmt(r.amount)} ฿
                </div>
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
        <Modal title={modal.mode==="add"?"เพิ่มรายการ":"แก้ไขรายการ"} onClose={()=>setModal(null)} onSave={handleSave} saving={saving}>
          <div className="field"><label>วันที่</label>
            <input type="date" value={form.txDate} onChange={e=>setForm({...form,txDate:e.target.value})} />
          </div>
          <div className="field"><label>ประเภท</label>
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="EXPENSE">รายจ่าย</option>
              <option value="INCOME">รายรับ</option>
            </select>
          </div>
          <div className="field"><label>หมวดหมู่</label>
            <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>รายละเอียด</label>
            <input placeholder="ชื่อรายการ" value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} />
          </div>
          <div className="field"><label>จำนวนเงิน (฿)</label>
            <input type="number" min="0" step="1" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
          </div>
          <div className="field"><label>หมายเหตุ</label>
            <input placeholder="หมายเหตุ (ถ้ามี)" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} />
          </div>
        </Modal>
      )}
    </div>
  );
}
