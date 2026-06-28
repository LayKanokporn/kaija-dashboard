import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";

const fmt = n => (+(n||0)).toLocaleString();
const CAT_ICON = {"วัตถุดิบ":"🥕","ค่าเดินทาง":"🚗","พัสดุ":"📦","สาธารณูปโภค":"💡","อาหาร":"🍱","สินค้า":"🛍","รายรับ":"💚","อื่นๆ":"📋"};
const icon = cat => { for(const k of Object.keys(CAT_ICON)) if(cat?.includes(k)) return CAT_ICON[k]; return "📋"; };
const CATS = ["วัตถุดิบ","ค่าเดินทาง","พัสดุ","สาธารณูปโภค","อาหาร","สินค้า","อื่นๆ"];
const EMPTY_FORM = { txDate:"", type:"EXPENSE", category:"อื่นๆ", itemName:"", amount:"", note:"" };

function groupByDate(rows) {
  const groups = {};
  rows.forEach(r => {
    const d = r.date || "ไม่ระบุวัน";
    if (!groups[d]) groups[d] = [];
    groups[d].push(r);
  });
  return Object.entries(groups).sort((a,b) => {
    const [da, db] = [a[0], b[0]];
    const pa = da.split("/").reverse().join(""), pb = db.split("/").reverse().join("");
    return pb.localeCompare(pa);
  });
}

export default function Expense() {
  const qc = useQueryClient();
  const toast = useToast();
  const [days, setDays]       = useState(7);
  const [filter, setFilter]   = useState("all");
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [catEdit, setCatEdit]   = useState(null);

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
  const visible = rows.filter(r=>filter==="all"||(filter==="income"?r.type==="INCOME":r.type==="EXPENSE"));

  const grouped = useMemo(() => groupByDate(visible), [visible]);

  // เปิดวันแรก (ล่าสุด) อัตโนมัติ
  useMemo(() => {
    if (grouped.length > 0 && expanded.size === 0) {
      setExpanded(new Set([grouped[0][0]]));
    }
  }, [grouped.length]);

  const toggleDate = (date) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  };

  const openAdd = () => {
    setForm({ ...EMPTY_FORM, txDate: new Date().toLocaleDateString("en-CA") });
    setModal({ mode:"add" });
  };
  const openEdit = row => {
    setForm({ txDate:row.date, type:row.type, category:row.category, itemName:row.itemName||"", amount:String(row.amount), note:row.note||"" });
    setModal({ mode:"edit", row });
  };
  const handleSave = async () => {
    if (!form.amount || isNaN(+form.amount)) { toast.error("กรุณาใส่จำนวนเงิน"); return; }
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await api.addExpense({ txDate:form.txDate, type:form.type, category:form.category, itemName:form.itemName||form.category, amount:form.amount, note:form.note });
        toast.success("เพิ่มรายการสำเร็จ");
      } else {
        await api.updateExpense({ rowIndex:modal.row.rowIndex, txDate:form.txDate, type:form.type, category:form.category, itemName:form.itemName, amount:form.amount, note:form.note });
        toast.success("แก้ไขสำเร็จ");
      }
      setModal(null);
      invalidate();
    } catch(e) { toast.error("บันทึกไม่สำเร็จ: " + e.message); }
    finally { setSaving(false); }
  };
  const confirmDelete = async () => {
    const row = deleting;
    try { await api.deleteExpense(row.rowIndex); invalidate(); toast.success("ลบสำเร็จ"); }
    catch(e) { toast.error("ลบไม่สำเร็จ: " + e.message); }
    finally { setDeleting(null); }
  };
  const handleCatChange = async (row, newCat) => {
    setCatEdit(null);
    if (newCat === row.category) return;
    try {
      await api.updateExpense({ rowIndex: row.rowIndex, category: newCat });
      toast.success("เปลี่ยนหมวดหมู่สำเร็จ");
      invalidate();
    } catch (e) { toast.error("เปลี่ยนหมวดหมู่ไม่สำเร็จ: " + e.message); }
  };

  if (isLoading) return <div><div className="skeleton sk-hero" /><div className="sk-row"><div className="skeleton sk-card" /><div className="skeleton sk-card" /><div className="skeleton sk-card" /></div><div className="sk-list">{[1,2,3,4].map(i=><div key={i} className="skeleton sk-item" />)}</div></div>;
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

      {/* Grouped by date */}
      {grouped.length === 0
        ? <div className="tx-list"><div className="empty">ไม่มีข้อมูล</div></div>
        : grouped.map(([date, items]) => {
            const dayExp = items.filter(r=>r.type==="EXPENSE").reduce((s,r)=>s+r.amount,0);
            const dayInc = items.filter(r=>r.type==="INCOME").reduce((s,r)=>s+r.amount,0);
            const isOpen = expanded.has(date);
            return (
              <div key={date} className="day-group">
                <button className="day-header" onClick={() => toggleDate(date)}>
                  <span className="day-date">{date}</span>
                  <span className="day-summary">
                    {dayExp > 0 && <span className="c-red">-{fmt(dayExp)}</span>}
                    {dayInc > 0 && <span className="c-green">+{fmt(dayInc)}</span>}
                    <span className="day-count">{items.length} รายการ</span>
                  </span>
                  <span className={"day-arrow" + (isOpen ? " open" : "")}>▸</span>
                </button>
                {isOpen && (
                  <div className="tx-list" style={{marginBottom:0}}>
                    {items.map((r,i)=>(
                      <div key={i} className="tx-item">
                        <div className="tx-avatar" style={{background:r.type==="INCOME"?"var(--green-bg)":"var(--red-bg)"}}>
                          {icon(r.category)}
                        </div>
                        <div className="tx-body">
                          <div className="tx-name">{r.itemName||r.note||r.category||"รายการ"}</div>
                          {catEdit === r.rowIndex ? (
                            <select className="cat-inline-select" autoFocus value={r.category}
                              onChange={e => handleCatChange(r, e.target.value)}
                              onBlur={() => setCatEdit(null)}>
                              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                          ) : (
                            <div className="tx-meta tx-cat-click" onClick={e=>{e.stopPropagation(); setCatEdit(r.rowIndex);}}>{r.category} ✏</div>
                          )}
                        </div>
                        <div className="tx-right">
                          <div className="tx-amount" style={{color:r.type==="INCOME"?"var(--green)":"var(--red)"}}>
                            {r.type==="INCOME"?"+":"-"}{fmt(r.amount)} ฿
                          </div>
                        </div>
                        <div className="tx-actions">
                          <button className="btn-icon btn-edit" title="แก้ไข" onClick={()=>openEdit(r)}>✏</button>
                          <button className="btn-icon btn-del"  title="ลบ"    onClick={()=>setDeleting(r)}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
      }

      {deleting && (
        <ConfirmDialog
          title="ยืนยันการลบ"
          message={`ลบ "${deleting.itemName||deleting.category}" ${fmt(deleting.amount)} ฿ ?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}

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
