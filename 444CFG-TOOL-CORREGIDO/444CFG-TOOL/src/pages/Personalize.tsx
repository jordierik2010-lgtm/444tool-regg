import logo from "../assets/logo.png";
import { Page, Toggle, useToast } from "../components/ui";
import { usePrefs, VARIANTS, type Variant } from "../services/prefs";

export default function Personalize() {
  const { prefs, set, reset } = usePrefs(); const toast = useToast();
  const Row = ({ t, d, k }: { t: string; d: string; k: "animations" | "glow" | "compact" }) =>
    <div className="switch"><div><b>{t}</b><div className="lead" style={{ margin: 0, fontSize: 12 }}>{d}</div></div><Toggle on={prefs[k]} onChange={v => set({ [k]: v })} label={t} /></div>;
  return (
    <Page kicker="Apariencia" title="Personalizar" lead="Ajusta el aspecto de 444CFG TOOL. Las preferencias se guardan entre sesiones.">
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <Row t="Animaciones" d="Transiciones de página y efectos de fondo." k="animations" />
          <Row t="Brillos" d="Resplandor al pasar el ratón y en botones principales." k="glow" />
          <Row t="Modo compacto" d="Menos espacio entre elementos." k="compact" />
          <label className="lbl" style={{ marginTop: 16 }}>Intensidad de efectos · {Math.round(prefs.intensity * 100)}%</label>
          <input className="range" type="range" min={0.1} max={1} step={0.05} value={prefs.intensity} onChange={e => set({ intensity: +e.target.value })} />
          <label className="lbl" style={{ marginTop: 16 }}>Color</label>
          <div className="swatches">{(Object.keys(VARIANTS) as Variant[]).map(v => <button key={v} className={`sw ${prefs.variant === v ? "on" : ""}`} title={VARIANTS[v].name} aria-label={VARIANTS[v].name} style={{ background: VARIANTS[v].hex }} onClick={() => set({ variant: v })} />)}</div>
          <p style={{ fontSize: 12, marginTop: 8 }}>{VARIANTS[prefs.variant].name}</p>
          <button className="btn" onClick={() => { reset(); toast("Apariencia restaurada", "ok"); }}>Restaurar apariencia inicial</button>
        </div>
        <div className="card" style={{ display: "grid", placeItems: "center" }}><img src={logo} alt="444" width={170} style={{ filter: "drop-shadow(0 0 24px rgba(var(--accent-rgb),.55))" }} /></div>
      </div>
    </Page>
  );
}
