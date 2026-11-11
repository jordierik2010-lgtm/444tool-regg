import { useCallback, useEffect, useState } from "react";
import { api, type LicenseStatus } from "./services/api";
import { usePrefs } from "./services/prefs";
import { Effects } from "./components/Effects";
import { Sidebar, Titlebar, type PageId } from "./components/Shell";
import { Spinner } from "./components/ui";
import Activation from "./pages/Activation";
import Home from "./pages/Home";
import Personalize from "./pages/Personalize";
import Movement from "./pages/Movement";
import Gpu from "./pages/Gpu";
import Fivem from "./pages/Fivem";
import AppEffects from "./pages/AppEffects";
import Settings from "./pages/Settings";
import License from "./pages/License";

export default function App() {
  const { prefs } = usePrefs();
  const [lic, setLic] = useState<LicenseStatus | null>(null);
  const [page, setPage] = useState<PageId>("home");
  const refresh = useCallback(async () => { try { setLic(await api.licenseStatus()); } catch (e) { setLic({ active: false, hwid: "", activated_at: null, error: String(e) }); } }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const fx = <Effects effect={prefs.animations ? prefs.effect : "none"} intensity={prefs.intensity} speed={prefs.speed} lowPower={prefs.lowPower} />;
  return (
    <div className="app">
      {fx}
      <Titlebar />
      {!lic ? <div className="body" style={{ placeItems: "center", display: "grid" }}><Spinner /></div>
        : !lic.active ? <Activation lic={lic} onActivated={refresh} />
        : <div className="body">
            <Sidebar page={page} go={setPage} licensed />
            <main className="main" key={page}>
              {page === "home" && <Home go={setPage} lic={lic} />}
              {page === "custom" && <Personalize />}
              {page === "movement" && <Movement />}
              {page === "gpu" && <Gpu />}
              {page === "fivem" && <Fivem />}
              {page === "effects" && <AppEffects />}
              {page === "settings" && <Settings />}
              {page === "license" && <License lic={lic} onChange={refresh} />}
            </main>
          </div>}
    </div>
  );
}
