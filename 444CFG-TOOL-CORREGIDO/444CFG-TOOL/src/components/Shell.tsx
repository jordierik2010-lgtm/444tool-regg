import { getCurrentWindow } from "@tauri-apps/api/window";
import logo from "../assets/logo.png";
import { APP_VERSION, openDiscord } from "../services/api";
import { DiscordIcon } from "./ui";

export function Titlebar() {
  const w = getCurrentWindow();
  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="brand" data-tauri-drag-region><img src={logo} alt="" data-tauri-drag-region /> 444<b>CFG</b> <span className="ver">V{APP_VERSION}</span></div>
      <button className="wbtn" aria-label="Minimizar" onClick={() => w.minimize()}>–</button>
      <button className="wbtn" aria-label="Maximizar" onClick={() => w.toggleMaximize()}>▢</button>
      <button className="wbtn close" aria-label="Cerrar" onClick={() => w.close()}>✕</button>
    </div>
  );
}

export type PageId = "home" | "custom" | "movement" | "gpu" | "fivem" | "effects" | "settings" | "license";
const NAV: { id: PageId; n: string; label: string; group: string }[] = [
  { id: "home", n: "01", label: "Inicio", group: "PRINCIPAL" }, { id: "custom", n: "02", label: "Personalizar", group: "PRINCIPAL" },
  { id: "movement", n: "03", label: "Movement", group: "OPTIMIZACIÓN" }, { id: "gpu", n: "04", label: "NVIDIA / GPU", group: "OPTIMIZACIÓN" },
  { id: "fivem", n: "05", label: "FiveM Optimizer", group: "OPTIMIZACIÓN" }, { id: "effects", n: "06", label: "App Effects", group: "SISTEMA" },
  { id: "settings", n: "07", label: "Configuración", group: "SISTEMA" }, { id: "license", n: "08", label: "Licencia", group: "SISTEMA" },
];
export function Sidebar({ page, go, licensed }: { page: PageId; go: (p: PageId) => void; licensed: boolean }) {
  let last = "";
  return (
    <aside className="sidebar">
      <div className="side-brand"><img src={logo} alt="444" /><div><b>444CFG TOOL</b><small>WINDOWS · FIVEM</small></div></div>
      {NAV.map(i => { const h = i.group !== last; last = i.group; return (
        <div key={i.id}>{h && <div className="nav-h">{i.group}</div>}
          <button className={`nav ${page === i.id ? "on" : ""}`} onClick={() => go(i.id)}><i>{i.n}</i>{i.label}</button></div>); })}
      <div className="side-foot">
        <button className="btn sm" onClick={() => openDiscord()}><DiscordIcon /> Discord</button>
        <div className="foot-meta"><span>444CFG TOOL · v{APP_VERSION}</span><span><span className={`dot ${licensed ? "" : "off"}`} />{licensed ? "LICENCIA ACTIVA" : "SIN LICENCIA"}</span></div>
      </div>
    </aside>
  );
}
