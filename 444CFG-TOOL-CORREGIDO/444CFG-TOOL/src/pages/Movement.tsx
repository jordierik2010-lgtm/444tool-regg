import { useEffect, useRef, useState } from "react";
import { api, errText, needsAdmin, onEvent, type Report, type SystemInfo, type TweakInfo } from "../services/api";
import { Bar, Modal, Page, Spinner, useToast } from "../components/ui";

type Stage = "idle" | "confirm-apply" | "confirm-restore" | "running" | "admin" | "done" | "confirm-reboot";
const CATS = ["Mouse", "Keyboard", "Input", "Network", "System"];

function VideoPlayer() {
  const [src, setSrc] = useState<string | null>(null); const ref = useRef<HTMLVideoElement>(null); const objUrl = useRef<string | null>(null);
  useEffect(() => {
    fetch("/movement.mp4", { method: "HEAD" }).then(r => { if (r.ok && (r.headers.get("content-type") || "").startsWith("video")) setSrc("/movement.mp4"); }).catch(() => {});
    return () => { if (objUrl.current) URL.revokeObjectURL(objUrl.current); };
  }, []);
  const pick = (f?: File) => { if (!f) return; if (objUrl.current) URL.revokeObjectURL(objUrl.current); objUrl.current = URL.createObjectURL(f); setSrc(objUrl.current); };
  return (
    <div className="video">
      {src ? <video ref={ref} src={src} controls preload="metadata" playsInline /> :
        <div className="empty"><div><b style={{ color: "var(--text)" }}>MOVEMENT PREVIEW</b><br />Aún no hay vídeo de demostración.</div>
          <label className="btn primary">Seleccionar vídeo<input type="file" accept="video/*" hidden onChange={e => pick(e.target.files?.[0])} /></label>
          <small>Para incluirlo en la app, copia el archivo a <code>public/movement.mp4</code> y recompila.</small></div>}
    </div>
  );
}

export default function Movement() {
  const toast = useToast();
  const [tweaks, setTweaks] = useState<TweakInfo[]>([]); const [sys, setSys] = useState<SystemInfo | null>(null);
  const [stage, setStage] = useState<Stage>("idle"); const [mode, setMode] = useState<"apply" | "restore">("apply");
  const [prog, setProg] = useState(0); const [report, setReport] = useState<Report | null>(null); const [err, setErr] = useState<string | null>(null);
  const load = () => api.tweaks().then(setTweaks).catch(e => setErr(errText(e)));
  useEffect(() => { load(); api.systemInfo().then(setSys).catch(() => {}); const u = onEvent<{ done: number; total: number }>("movement-progress", p => setProg(p.total ? p.done / p.total : 0)); return () => { u.then(f => f()); }; }, []);

  const supported = !sys || sys.build === null || sys.build >= 10240;
  const anyApplied = tweaks.some(t => t.applied);
  const open = (m: "apply" | "restore") => { setMode(m); setErr(null); load(); setStage(m === "apply" ? "confirm-apply" : "confirm-restore"); };
  const run = async () => {
    setStage("running"); setProg(0); setErr(null);
    try { const r = mode === "apply" ? await api.applyMovement() : await api.restoreMovement(); setReport(r); setStage("done"); load(); }
    catch (e) { if (needsAdmin(e)) setStage("admin"); else { setErr(errText(e)); setStage("idle"); toast(errText(e), "err"); } }
  };
  const close = () => setStage("idle");

  return (
    <Page kicker="Optimización" title="Movement" lead="Optimizaciones de entrada, ratón, teclado y configuraciones compatibles del sistema.">
      <div className="sect">VISTA PREVIA</div>
      <VideoPlayer />
      <div className="sect">QUÉ OPTIMIZA</div>
      <div className="chips">{CATS.map(c => { const n = tweaks.filter(t => t.category === c).length; return <span key={c} className={`chip ${n ? "" : "off"}`} title={n ? `${n} ajustes verificados` : "Sin ajustes verificados en esta versión"}>{c}{n ? ` · ${n}` : ""}</span>; })}</div>
      <p className="lead" style={{ marginTop: 10, fontSize: 12 }}>Solo se muestran como disponibles los ajustes revisados. No se garantizan mejoras de FPS, ping o precisión: no se han medido.</p>
      {!supported && <div className="msg err">Esta versión de Windows no es compatible.</div>}
      {err && <div className="msg err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="col" style={{ marginTop: 18 }}>
        <button className="btn primary big" disabled={!supported || tweaks.length === 0} onClick={() => open("apply")}>▷ APLICAR MOVEMENT TWEAK</button>
        <button className="btn big" disabled={!anyApplied} title={anyApplied ? "" : "No hay cambios aplicados que restaurar"} onClick={() => open("restore")}>↺ RESTAURAR ORIGINAL</button>
      </div>

      {(stage === "confirm-apply" || stage === "confirm-restore") && (
        <Modal title={mode === "apply" ? "Confirmar cambios" : "Restaurar valores originales"}
          actions={<><button className="btn" onClick={close}>Cancelar</button><button className="btn primary" onClick={run}>{mode === "apply" ? "Aplicar" : "Restaurar"}</button></>}>
          <p style={{ color: "#aab2d0" }}>{mode === "apply" ? "Se guardará primero una copia de los valores actuales (incluida la ausencia de la clave). Estos son los cambios:" : "Se recuperarán los valores guardados antes de aplicar. Los valores que no existían se eliminarán:"}</p>
          <table><thead><tr><th>AJUSTE</th><th>ACTUAL</th>{mode === "apply" && <th>NUEVO</th>}</tr></thead><tbody>
            {tweaks.filter(t => mode === "apply" || t.applied).map(t => <tr key={t.id}><td>{t.label}<br /><code>{t.target}</code>{t.needs_admin && <> <span className="tag">ADMIN</span></>}</td><td><code>{t.current}</code></td>{mode === "apply" && <td><code>{t.new_value}</code></td>}</tr>)}
          </tbody></table>
        </Modal>)}

      {stage === "running" && <Modal title={mode === "apply" ? "Aplicando…" : "Restaurando…"} actions={null}><div className="row" style={{ marginBottom: 10 }}><Spinner /> Procesando y verificando cada ajuste</div><Bar value={prog} /></Modal>}

      {stage === "admin" && <Modal title="Permisos de administrador" actions={<><button className="btn" onClick={close}>Cancelar</button><button className="btn primary" onClick={() => api.relaunchAdmin().catch(e => toast(errText(e), "err"))}>Reiniciar app como administrador</button></>}>
        <p style={{ color: "#aab2d0" }}>Algunos ajustes están en HKLM y requieren administrador. Windows te pedirá confirmación (UAC). Tras reabrir, vuelve a pulsar el botón.</p></Modal>}

      {stage === "done" && report && (
        <Modal title={report.all_ok ? (mode === "apply" ? "444CFG — OPTIMIZACIÓN COMPLETADA" : "444CFG — RESTAURACIÓN COMPLETADA") : "Completado con errores"}
          actions={report.reboot_recommended ? <><button className="btn" onClick={close}>REINICIAR MÁS TARDE</button><button className="btn primary" onClick={() => setStage("confirm-reboot")}>REINICIAR AHORA</button></> : <button className="btn primary" onClick={close}>Cerrar</button>}>
          {report.reboot_recommended && <p style={{ color: "#aab2d0" }}>Algunos cambios pueden requerir reiniciar Windows para aplicarse completamente.</p>}
          <table><tbody>{report.results.map(r => <tr key={r.id}><td>{r.ok ? "✓" : "✕"}</td><td>{r.label}{r.error && <div className="msg err" style={{ marginTop: 4 }}>{r.error}</div>}</td></tr>)}</tbody></table>
        </Modal>)}

      {stage === "confirm-reboot" && <Modal title="¿Reiniciar Windows?" actions={<><button className="btn" onClick={close}>Cancelar</button><button className="btn primary" onClick={() => { api.restartWindows().then(() => toast("Reinicio en 30 s. Para cancelarlo: shutdown /a", "info")).catch(e => toast(errText(e), "err")); close(); }}>Sí, reiniciar</button></>}>
        <p style={{ color: "#aab2d0" }}>Guarda tu trabajo y cierra programas. El equipo se reiniciará en 30 segundos (cancelable ejecutando <code>shutdown /a</code>).</p></Modal>}
    </Page>
  );
}
