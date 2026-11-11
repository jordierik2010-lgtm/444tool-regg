import { EFFECTS, Effects, prefersReducedMotion } from "../components/Effects";
import { Page, Toggle, useToast } from "../components/ui";
import { usePrefs } from "../services/prefs";

export default function AppEffects() {
  const { prefs, set } = usePrefs(); const toast = useToast(); const reduced = prefersReducedMotion();
  return (
    <Page kicker="Sistema" title="App Effects" lead="Efectos visuales animados para el fondo de 444CFG TOOL. Solo afectan a esta aplicación, no al clima de FiveM ni de GTA V. Se guardan automáticamente.">
      {reduced && <div className="msg warn" style={{ marginBottom: 12 }}>Windows tiene activada la reducción de movimiento: los efectos están pausados.</div>}
      <div className="grid">{EFFECTS.map(e => { const on = prefs.effect === e.id; return (
        <div key={e.id} className="card hover" style={on ? { borderColor: "var(--accent)" } : undefined}>
          <div style={{ position: "relative", height: 90, borderRadius: 10, overflow: "hidden", background: "#030510", marginBottom: 10, border: "1px solid var(--line)" }}>
            <Effects className="fx-preview" effect={e.id} intensity={prefs.intensity} speed={prefs.speed} lowPower />
          </div>
          <h3>{e.name}</h3><p>{e.desc}</p>
          <div className="row">
            <button className="btn primary sm" disabled={on} onClick={() => { set({ effect: e.id, animations: true }); toast(`Efecto: ${e.name}`, "ok"); }}>ACTIVAR</button>
            <button className="btn sm" disabled={!on || e.id === "none"} onClick={() => set({ effect: "none" })}>DESACTIVAR</button>
          </div></div>); })}</div>
      <div className="sect">AJUSTES</div>
      <div className="card">
        <label className="lbl">Intensidad · {Math.round(prefs.intensity * 100)}%</label><input className="range" type="range" min={0.1} max={1} step={0.05} value={prefs.intensity} onChange={e => set({ intensity: +e.target.value })} />
        <label className="lbl" style={{ marginTop: 14 }}>Velocidad · {prefs.speed.toFixed(1)}×</label><input className="range" type="range" min={0.2} max={2} step={0.1} value={prefs.speed} onChange={e => set({ speed: +e.target.value })} />
        <div className="switch" style={{ marginTop: 10 }}><div><b>Modo de bajo consumo</b><div className="lead" style={{ margin: 0, fontSize: 12 }}>30 FPS, menos partículas, sin escalado HiDPI.</div></div><Toggle on={prefs.lowPower} onChange={v => set({ lowPower: v })} label="Bajo consumo" /></div>
      </div>
    </Page>
  );
}
