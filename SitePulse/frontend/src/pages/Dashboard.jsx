import { useState, useEffect, useCallback } from "react";
import { Globe, TrendingUp, AlertTriangle, Zap, RefreshCw, Plus } from "lucide-react";
import StatusCard      from "../components/StatusCard.jsx";
import MonitorCard     from "../components/MonitorCard.jsx";
import Charts          from "../components/Charts.jsx";
import IncidentLog     from "../components/IncidentLog.jsx";
import AddMonitorModal from "../components/AddMonitorModal.jsx";
import { api }         from "../api.js";

export default function Dashboard() {
  const [monitors,  setMonitors]  = useState([]);
  const [stats,     setStats]     = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [chart,     setChart]     = useState([]);
  const [modal,     setModal]     = useState(false);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const [ms, st, inc] = await Promise.all([
        api.getWebsites(),
        api.getStats(),
        api.getIncidents("limit=8"),
      ]);
      setMonitors(ms);
      setStats(st);
      setIncidents(inc);
      if (ms.length > 0) {
        const h = await api.getHistory(ms[0].id, 24);
        setChart(h);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const addMonitor = async (data) => {
    await api.createWebsite(data);
    await load();
  };

  const deleteMonitor = async (id) => {
    if (!confirm("Remove this monitor?")) return;
    await api.deleteWebsite(id);
    setMonitors(p => p.filter(m => m.id !== id));
  };

  const toggleMonitor = async (id, isActive) => {
    const updated = await api.updateWebsite(id, { is_active: isActive });
    setMonitors(p => p.map(m => m.id === id ? updated : m));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      {/* Responsive header */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
    <div>
        <h1 className="text-lg sm:text-xl font-bold text-white">Dashboard</h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">Auto-refreshes every 30s</p>
    </div>
    <div className="flex gap-2">
        <button onClick={load} className="btn-ghost flex items-center gap-1.5 text-xs p-2 sm:px-3">
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Refresh</span>
        </button>
        <button onClick={() => setModal(true)} className="btn flex items-center gap-1.5 text-xs">
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Add Monitor</span>
        <span className="sm:hidden">Add</span>
        </button>
    </div>
    </div>


      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard title="Total Monitors" value={stats?.total_monitors ?? monitors.length}         icon={Globe}          color="blue"   subtitle="Active targets" />
        <StatusCard title="Monitors Up"    value={stats?.monitors_up   ?? "—"}                     icon={TrendingUp}     color="green"  subtitle={`${stats?.avg_uptime_percentage ?? 0}% uptime`} />
        <StatusCard title="Down / Slow"    value={`${stats?.monitors_down ?? 0} / ${stats?.monitors_slow ?? 0}`} icon={AlertTriangle} color="red" subtitle={`${stats?.active_incidents ?? 0} active incidents`} />
        <StatusCard title="Avg Response"   value={stats ? `${Math.round(stats.avg_response_time_ms)}ms` : "—"} icon={Zap} color="yellow" subtitle={`${stats?.total_incidents_today ?? 0} incidents today`} />
      </div>

      {/* Charts + incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Charts data={chart} title="Response Time & Uptime (24h)" />
        </div>
        <IncidentLog incidents={incidents} />
      </div>

      {/* Monitor list */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">All Monitors</h2>
        {loading ? (
          <div className="card flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monitors.length === 0 ? (
          <div className="card text-center py-12">
            <Globe className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No monitors yet.</p>
            <button onClick={() => setModal(true)} className="btn mt-3 text-xs">Add your first monitor</button>
          </div>
        ) : (
          <div className="space-y-2">
            {monitors.map(m => (
              <MonitorCard key={m.id} monitor={m} onDelete={deleteMonitor} onToggle={toggleMonitor} />
            ))}
          </div>
        )}
      </div>

      {modal && <AddMonitorModal onAdd={addMonitor} onClose={() => setModal(false)} />}
    </div>
  );
}
