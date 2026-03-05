import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar        from "./components/Sidebar.jsx";
import Dashboard      from "./pages/Dashboard.jsx";
import Monitors       from "./pages/Monitors.jsx";
import Incidents      from "./pages/Incidents.jsx";
import WebsiteDetail  from "./pages/WebsiteDetail.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 md:ml-56 p-4 sm:p-6 lg:p-8 max-w-6xl animate-fadein">
          <Routes>
            <Route path="/"              element={<Dashboard />}     />
            <Route path="/monitors"      element={<Monitors />}      />
            <Route path="/monitors/:id"  element={<WebsiteDetail />} />
            <Route path="/incidents"     element={<Incidents />}     />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
