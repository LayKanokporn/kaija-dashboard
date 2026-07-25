import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { isoToTH, todayISO } from "../dateutil";
import { useToast } from "../components/Toast";

const fmt = n => (+(n || 0)).toLocaleString();
const num = v => { const n = parseFloat(String(v).replace(/,/g, "")); return isNaN(n) ? 0 : n; };

export default function RecordSale() {
  const qc = useQueryClient();
  const toast = useToast();

  const [channel, setChannel]   = useState("store");     // store | booth
  const [boothName, setBooth]   = useState("");
  const [dateISO, setDateISO]   = useState(() => todayISO());
  const [f, setF] = useState({ cashForward: "", cashIncome: "", cashExpense: "", reserveIn: "", toReserve: "", transferIncome: "", countedCash: "" });
  const [showExtra, setShowExtra] = useState(false);
  const [fwdTouched, setFwdTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const location = channel === "booth" ? boothName.trim() : "";
  const txDateTH = isoToTH(dateISO);

  // รายชื่อบูทที่เคยบันทึก — จาก batch cache เดียวกับ Dashboard
  const { data: batchData } = useQuery({ queryKey: ['batch', 30], queryFn: () => api.batch(30) });
  const knownBooths = useMemo(() => {
    const rows = batchData?.storefront?.rows || [];
    return [...new Set(rows.map(r => (r.location || "").trim()).filter(Boolean))];
  }, [batchData]);

  // ยกมาอัตโนมัติตามช่องทาง+วัน
  const { data: prev, isFetching: prevLoading } = useQuery({
    queryKey: ['prevBalance', location, txDateTH],
    queryFn: () => api.getPrevBalance(location, txDateTH),
    enabled: channel === "store" || !!location,
  });

  // ถ้ายังไม่แก้เอง ใช้ค่าจากระบบ
  const cashForward = fwdTouched ? num(f.cashForward) : (prev?.prevBalance ?? 0);

  const cashIncome  = num(f.cashIncome);
  const cashExpense = num(f.cashExpense);
  const reserveIn   = num(f.reserveIn);
  const toReserve   = num(f.toReserve);
  const transfer    = num(f.transferIncome);

  const computedBalance = cashForward + cashIncome - cashExpense + reserveIn - toReserve;
  const totalSales      = cashIncome + transfer;
  const counted   = f.countedCash === "" ? null : num(f.countedCash);
  const countDiff = counted === null ? 0 : counted - computedBalance;

  const set = k => e => setF({ ...f, [k]: e.target.value });

  const handleSave = async () => {
    if (channel === "booth" && !location) { toast.error("ใส่ชื่อบูทก่อน"); return; }
    if (cashIncome === 0 && transfer === 0) { toast.error("ยังไม่ได้ใส่ยอดขาย"); return; }
    setSaving(true);
    try {
      const res = await api.addStorefront({
        txDate: txDateTH,
        cashForward, cashIncome, cashExpense, reserveIn, toReserve,
        transferIncome: transfer,
        location,
      });
      toast.success(res?.revised ? "อัปเดตยอดทับของเดิมแล้ว" : "บันทึกยอดสำเร็จ");
      setF({ cashForward: "", cashIncome: "", cashExpense: "", reserveIn: "", toReserve: "", transferIncome: "", countedCash: "" });
      setFwdTouched(false);
      qc.invalidateQueries({ queryKey: ['batch'] });
      qc.invalidateQueries({ queryKey: ['storefront'] });
      qc.invalidateQueries({ queryKey: ['prevBalance'] });
    } catch (e) { toast.error("บันทึกไม่สำเร็จ: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="record-page">
      {/* ช่องทาง */}
      <div className="pill-row" style={{ marginBottom: 12 }}>
        <button className={"pill" + (channel === "store" ? " active" : "")} onClick={() => setChannel("store")}>🏪 หน้าร้าน</button>
        <button className={"pill" + (channel === "booth" ? " active" : "")} onClick={() => setChannel("booth")}>🎪 ออกบูท</button>
        <input type="date" className="select-sm" style={{ marginLeft: "auto" }} value={dateISO} onChange={e => setDateISO(e.target.value)} />
      </div>

      {channel === "booth" && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label>ชื่อบูท / สถานที่</label>
          <input list="booth-list" placeholder="เช่น เซ็นทรัลลาดพร้าว" value={boothName} onChange={e => setBooth(e.target.value)} />
          <datalist id="booth-list">
            {knownBooths.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
      )}

      {prev?.existsSameDate && (
        <div className="rec-banner rec-banner-info">วันนี้บันทึก{location ? `บูท ${location}` : "หน้าร้าน"}ไปแล้ว — กดบันทึกจะแทนที่ยอดเดิม</div>
      )}

      <div className="rec-card">
        <div className="field">
          <label>ยกมา {prev?.prevDate && !fwdTouched ? <span className="rec-hint">(จากคงเหลือ {prev.prevDate})</span> : null}</label>
          <input type="number" inputMode="decimal"
            value={fwdTouched ? f.cashForward : (prevLoading ? "" : String(prev?.prevBalance ?? 0))}
            placeholder={prevLoading ? "กำลังดึง..." : "0"}
            onChange={e => { setFwdTouched(true); setF({ ...f, cashForward: e.target.value }); }} />
        </div>
        <div className="field">
          <label>💵 รายรับเงินสด</label>
          <input type="number" inputMode="decimal" placeholder="0" value={f.cashIncome} onChange={set("cashIncome")} />
        </div>
        <div className="field">
          <label>📲 รายรับเงินโอน</label>
          <input type="number" inputMode="decimal" placeholder="0" value={f.transferIncome} onChange={set("transferIncome")} />
        </div>
        <div className="field">
          <label>💸 รายจ่าย (จ่ายจากลิ้นชัก)</label>
          <input type="number" inputMode="decimal" placeholder="0" value={f.cashExpense} onChange={set("cashExpense")} />
        </div>

        <button className="rec-extra-toggle" onClick={() => setShowExtra(!showExtra)}>
          {showExtra ? "▾" : "▸"} เงินสำรอง (เติมเข้า/แยกเก็บ)
        </button>
        {showExtra && (
          <>
            <div className="field">
              <label>➕ นำเงินสำรองเติมเข้าหน้าร้าน</label>
              <input type="number" inputMode="decimal" placeholder="0" value={f.reserveIn} onChange={set("reserveIn")} />
            </div>
            <div className="field">
              <label>🏦 เก็บเข้าบัญชีสำรอง</label>
              <input type="number" inputMode="decimal" placeholder="0" value={f.toReserve} onChange={set("toReserve")} />
            </div>
          </>
        )}
      </div>

      {/* สรุปคำนวณสด */}
      <div className="rec-summary">
        <div className="rec-sum-row">
          <span>เงินสดคงเหลือ (คำนวณ)</span>
          <b className={computedBalance >= 0 ? "c-green" : "c-red"}>{fmt(computedBalance)} ฿</b>
        </div>
        <div className="rec-sum-row rec-sum-big">
          <span>ยอดขายรวม</span>
          <b className="c-green">{fmt(totalSales)} ฿</b>
        </div>
      </div>

      {/* เช็คนับเงินจริง */}
      <div className="rec-card" style={{ marginTop: 12 }}>
        <div className="field">
          <label>🔍 เงินสดนับได้จริง (ไม่บังคับ — ไว้เช็คยอด)</label>
          <input type="number" inputMode="decimal" placeholder="นับเงินในลิ้นชักแล้วใส่ตรงนี้" value={f.countedCash} onChange={set("countedCash")} />
        </div>
        {counted !== null && (
          Math.abs(countDiff) < 0.01
            ? <div className="rec-banner rec-banner-ok">✓ ยอดตรงกับที่คำนวณ</div>
            : <div className="rec-banner rec-banner-warn">ต่างกัน {fmt(Math.abs(countDiff))} ฿ ({countDiff > 0 ? "เงินเกิน" : "เงินขาด"}) — เช็ครายจ่าย/ยอดโอนอีกรอบ</div>
        )}
      </div>

      <button className="rec-save" disabled={saving} onClick={handleSave}>
        {saving ? "กำลังบันทึก..." : `✅ บันทึกยอด ${location ? location : "หน้าร้าน"} · ${txDateTH}`}
      </button>
    </div>
  );
}
