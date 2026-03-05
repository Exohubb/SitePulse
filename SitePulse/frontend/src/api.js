const BASE = import.meta.env.VITE_API_URL || "";

const json = (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
};

const post  = (url, body) => fetch(`${BASE}${url}`, { method: "POST",   headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(json);
const patch = (url, body) => fetch(`${BASE}${url}`, { method: "PATCH",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(json);
const del   = (url)       => fetch(`${BASE}${url}`, { method: "DELETE" }).then(json);
const get   = (url)       => fetch(`${BASE}${url}`).then(json);

export const api = {
  // Websites
  getWebsites:   ()          => get("/api/websites"),
  createWebsite: (d)         => post("/api/websites", d),
  updateWebsite: (id, d)     => patch(`/api/websites/${id}`, d),
  deleteWebsite: (id)        => del(`/api/websites/${id}`),
  getResults:    (id, n=50)  => get(`/api/websites/${id}/results?limit=${n}`),

  // Per-website detail
  getWebsiteDashboard: (id)          => get(`/api/websites/${id}/dashboard`),
  getWebsiteLogs:      (id, s="")    => get(`/api/websites/${id}/logs?limit=200${s ? `&status=${s}` : ""}`),

  // Dashboard
  getStats:   ()           => get("/api/dashboard/stats"),
  getHistory: (id, h=24)   => get(`/api/dashboard/history/${id}?hours=${h}`),

  // Incidents
  getIncidents: (p="")     => get(`/api/incidents?${p}`),
};
