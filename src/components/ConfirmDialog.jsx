import { useEffect } from "react";

export default function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "ลบ", loading }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="confirm-body">
          <div className="confirm-title">{title}</div>
          <div className="confirm-msg">{message}</div>
        </div>
        <div className="confirm-footer">
          <button className="btn-ghost" onClick={onCancel} disabled={loading}>ยกเลิก</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? "กำลังลบ…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
