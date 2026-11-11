import { useState } from "react";
import logo from "../assets/logo.png";
import { api, errText, openDiscord, type LicenseStatus } from "../services/api";
import { Spinner, useToast } from "../components/ui";

export default function Activation({ lic, onActivated }: { lic: LicenseStatus; onActivated: () => void }) {
  const [key, setKey] = useState(""); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [ok, setOk] = useState(false);
  const toast = useToast();
  const activate = async () => {
    setBusy(true); setErr(null);
    try { await api.activate(key); setOk(true); setTimeout(onActivated, 600); } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="act">
      <div className="hero">
        <img src={logo} alt="444" />
        <div className="kicker">— Sistema de activación</div>
        <h1>444 <b>CFG</b></h1>
        <div className="kicker" style={{ color: "#aab2d0" }}>Windows & FiveM Optimization Tool</div>
        <p className="lead" style={{ marginTop: 14 }}>Personaliza y optimiza tu configuración de Windows y FiveM desde una única herramienta.</p>
        <ul className="ticks"><li>Configuraciones locales</li><li>Ajustes controlados y reversibles</li><li>Herramientas integradas</li><li>Licencia vinculada al equipo</li></ul>
      </div>
      <div className="card" style={{ padding: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}><span className="stat">Clave de licencia</span><span className="tag">ED25519</span></div>
        <label className="lbl" htmlFor="k">Introduce tu clave</label>
        <input id="k" className="input" value={key} onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === "Enter" && key && activate()} placeholder="XXXXXXXX-XXXXXXXX-…" spellCheck={false} autoComplete="off" />
        {err && <div className="msg err" style={{ marginTop: 12 }}>{err}</div>}
        {ok && <div className="msg ok" style={{ marginTop: 12 }}>✓ Licencia activada</div>}
        <button className="btn primary big" style={{ marginTop: 14 }} disabled={busy || !key.trim()} onClick={activate}>{busy ? <Spinner /> : "ACTIVAR LICENCIA"}</button>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <span className="mono" style={{ color: "var(--mute)" }}>HWID: {lic.hwid || "no disponible"}</span>
          <button className="btn sm" disabled={!lic.hwid} onClick={() => navigator.clipboard.writeText(lic.hwid).then(() => toast("HWID copiado", "ok"), () => toast("No se pudo copiar", "err"))}>COPIAR HWID</button>
        </div>
        <button className="btn sm" style={{ marginTop: 14 }} onClick={() => openDiscord()}>Discord · discord.gg/444cfg</button>
      </div>
    </div>
  );
}
