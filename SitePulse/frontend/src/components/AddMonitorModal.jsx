import { useState } from "react";
import { X, Plus, Loader2, Globe, CheckCircle } from "lucide-react";

const INIT = {
  name: "", url: "", interval_seconds: 60,
  expected_status_code: 200, timeout_seconds: 30,
  retry_count: 3, response_time_threshold: 2000,
};

// ── Smart URL normalizer ───────────────────────────────────────────
function normalizeUrl(raw) {
  let url = raw.trim();
  if (!url) return "";
  // Already has protocol
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  // Has // prefix
  if (url.startsWith("//")) return "https:" + url;
  // Plain domain like google.com or www.google.com
  return "https://" + url;
}

function getDisplayPreview(raw) {
  if (!raw.trim()) return null;
  const normalized = normalizeUrl(raw);
  if (normalized !== raw.trim()) return normalized;
  return null;
}

export default function AddMonitorModal({ onAdd, onClose }) {
  const [form,    setForm]    = useState(INIT);
  const [rawUrl,  setRawUrl]  = useState("");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  const preview = getDisplayPreview(rawUrl);

  const set = (e) => {
    const { name, value, type } = e.target;
    setForm(p => ({ ...p, [name]: type === "number" ? Number(value) : value }));
  };

  const handleUrlChange = (e) => {
    setRawUrl(e.target.value);
    // Store normalized version in form
    setForm(p => ({ ...p, url: normalizeUrl(e.target.value) }));
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    const finalUrl = normalizeUrl(rawUrl);
    if (!finalUrl) { setErr("Please enter a URL"); return; }
    const payload = { ...form, url: finalUrl };
    try {
      setBusy(true); setErr("");
      await onAdd(payload);
      onClose();
    } catch (ex) {
      setErr(ex.message || "Failed to add monitor");
    } finally {
      setBusy(false);
    }
  };

  return (
    // Backdrop
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadein">
      {/* Sheet on mobile (slides from bottom), centered modal on desktop */}
      <div className="bg-surface-card border border-surface-muted rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-slidein max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-muted sticky top-0 bg-surface-card z-10">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            <h2 className="text-base font-semibold text-white">Add Monitor</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="px-5 py-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Display Name</label>
            <input name="name" value={form.name} onChange={set}
              className="input" placeholder="My Production API" required />
          </div>

          {/* URL — smart input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Website URL
              <span className="ml-2 text-slate-600 font-normal">(domain or full URL)</span>
            </label>
            <input
              value={rawUrl}
              onChange={handleUrlChange}
              className="input font-mono"
              placeholder="google.com or https://api.example.com"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {/* Preview of normalized URL */}
            {preview && (
              <div className="flex items-center gap-1.5 mt-1.5 animate-fadein">
                <CheckCircle className="w-3 h-3 text-up flex-shrink-0" />
                <p className="text-xs text-up font-mono truncate">
                  Will monitor: <span className="font-semibold">{preview}</span>
                </p>
              </div>
            )}
            {rawUrl && !preview && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">{form.url}</p>
            )}
          </div>

          {/* Row: Interval + Expected Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Interval (sec)</label>
              <input name="interval_seconds" type="number" value={form.interval_seconds} onChange={set}
                className="input" min={30} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Expected HTTP</label>
              <input name="expected_status_code" type="number" value={form.expected_status_code} onChange={set}
                className="input" />
            </div>
          </div>

          {/* Row: Timeout + Retries */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Timeout (sec)</label>
              <input name="timeout_seconds" type="number" value={form.timeout_seconds} onChange={set}
                className="input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Retries</label>
              <input name="retry_count" type="number" value={form.retry_count} onChange={set}
                className="input" min={1} max={5} />
            </div>
          </div>

          {/* Slow threshold */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Slow Threshold (ms)
              <span className="ml-2 text-slate-600">above this = SLOW</span>
            </label>
            <input name="response_time_threshold" type="number" value={form.response_time_threshold} onChange={set}
              className="input" min={500} />
          </div>

          {err && (
            <p className="text-xs text-down bg-down/10 border border-down/20 px-3 py-2 rounded-lg">
              {err}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1 pb-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 text-center justify-center">
              Cancel
            </button>
            <button type="submit" disabled={busy || !rawUrl.trim()} className="btn flex-1 flex items-center justify-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {busy ? "Adding..." : "Add Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
