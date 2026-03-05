import { useState, useEffect } from "react";
import { Plus, Search, Globe } from "lucide-react";
import MonitorCard     from "../components/MonitorCard.jsx";
import AddMonitorModal from "../components/AddMonitorModal.jsx";
import Charts          from "../components/Charts.jsx";
import { api }         from "../api.js";
import clsx            from "clsx";

export default function Monitors() {
  const [monitors, setMonitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [chart,    setChart]    = useState([]);

  const load = async () => {
    const ms = await api.getWebsites();
    setMonitors(ms);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = monitors.filter(m => {
    const s = m.last_status || "UNKNOWN";
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.url.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const handleClick = async (id) => {
    const h = await api.getHistory(id, 24);
    setChart(h);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Monitors</h1>
          <p className="text-xs text-slate-500 mt-0.5">{monitors.length} targets</p>
        </div>
        <button onClick={() => setModal(true)} className="btn flex items-center gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add Monitor
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search monitors..." />
        </div>
        <div className="flex gap-1 bg-surface-card border border-surface-muted rounded-lg p-1 text-xs">
          {["all","up","down","slow"].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={clsx(
              "px-3 py-1.5 rounded-md capitalize font-medium transition-all",
              filter === f ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
            )}>{f}</button>
          ))}
        </div>
      </div>

      {chart.length > 0 && <Charts data={chart} title="Selected Monitor — 24h" />}

      {loading ? (
        <div className="card flex items-center justify-center py-10">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} onClick={() => handleClick(m.id)}>
              <MonitorCard
                monitor={m}
                onDelete={async (id) => { await api.deleteWebsite(id); setMonitors(p => p.filter(x => x.id !== id)); }}
                onToggle={async (id, val) => { const u = await api.updateWebsite(id, { is_active: val }); setMonitors(p => p.map(x => x.id === id ? u : x)); }}
              />
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card text-center py-10">
              <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No monitors match.</p>
            </div>
          )}
        </div>
      )}

      {modal && <AddMonitorModal onAdd={async d => { await api.createWebsite(d); await load(); }} onClose={() => setModal(false)} />}
    </div>
  );
}
