import { useEffect, useState } from "react";
import { api, errText, fmtBytes, fmtDate, onEvent, pickFolder, type CleanStats, type FivemInfo, type Target } from "../services/api";
import { Bar, Modal, Page, Spinner, Toggle, useToast } from "../components/ui";

type Stage = "idle" | "preview" | "running" | "done";
export default function Fivem() {
  const toast = useToast();
  const [info, setInfo] = useState<FivemInfo | null>(null); const [nui, setNui] = useState(false);
  const [stage, setStage] = useState<Stage>("idle"); const [targets, setTargets] = useState<Target[]>([]);
  const [prog, setProg] = useState(0); const [stats, setStats] = useState<CleanStats | null>(null); const [busy, setBusy] = useState(false);
  const load = () => api.fivemInfo().then(setInfo).catch(e => toast(errText(e), "err"));
  useEffect(() => { load(); const u = onEvent<{ done: number; total: number }>("clean-progress", p => setProg(p.total ? p.done / p.total : 1)); return () => { u.then(f => f()); }; }, []);

  const choose = async () => { const p = await pickFolder(); if (!p) return; try { await api.setFivemPath(p); toast("Ruta guardada", "ok"); load(); } catch (e) { toast(errText(e), "err"); } };
  const preview = async () => { setBusy(true); try { setTargets(await api.fivemPreview(nui)); setStage("preview"); } catch (e) { toast(errText(e), "err"); } finally { setBusy(false); } };
  const clean = async () => { setStage("running"); setProg(0); try { setStats(await api.fivemClean(nui)); setStage("done"); load(); } catch (e) { toast(errText(e), "err"); setStage("idle"); } };
  const total = targets.reduce((a, t) => a + t.bytes, 0), files = targets.reduce((a, t) => a + t.files, 0);

  return (
    <Page kicker="Optimización" title="FiveM Optimizer" lead="Limpieza segura de la caché de FiveM. Solo se tocan carpetas de caché validadas; nunca mods, configuración personal, GTA V, Prefetch ni Temp de Windows.">
      {!info ? <Spinner /> : <>
        <div className="grid">
          <div className="card"><div className="stat">Instalación</div><div>{info.detected ? <><span className="dot" />Detectada</> : <><span className="dot off" />No detectada</>}</div><div className="mono" style={{ marginTop: 6, wordBreak: "break-all" }}>{info.path ?? "—"}</div>{info.error && <div className="msg warn" style={{ marginTop: 8 }}>{info.error}</div>}
            <div className="row" style={{ marginTop: 10 }}><button className="btn sm" onClick={choose}>Seleccionar ruta…</button>{info.custom && <button className="btn sm" onClick={() => api.setFivemPath(null).then(load)}>Autodetectar</button>}</div></div>
          <div className="card"><div className="stat">Tamaño de caché</div><div>{fmtBytes(info.cache_bytes)}</div><div className="stat" style={{ marginTop: 10 }}>nui-storage (aparte)</div><div>{fmtBytes(info.nui_bytes)}</div></div>
          <div className="card"><div className="stat">Última limpieza</div><div>{fmtDate(info.last_clean_ts)}</div><div className="stat" style={{ marginTop: 10 }}>Espacio liberado</div><div>{info.last_freed_bytes != null ? fmtBytes(info.last_freed_bytes) : "—"}</div></div>
        </div>
        <div className="sect">LIMPIEZA</div>
        <div className="card">
          <div className="switch"><div><b>cache · server-cache · server-cache-priv</b><div className="lead" style={{ margin: 0, fontSize: 12 }}>Siempre incluidas.</div></div><span className="tag">ACTIVO</span></div>
          <div className="switch"><div><b>nui-storage</b><div className="lead" style={{ margin: 0, fontSize: 12 }}>Puede borrar datos locales guardados por interfaces de servidores (ajustes de UI, sesiones). Desactivado por defecto.</div></div><Toggle on={nui} onChange={setNui} label="Incluir nui-storage" /></div>
          {info.running && <div className="msg warn" style={{ marginTop: 10 }}>FiveM está abierto. Ciérralo para poder limpiar.</div>}
          <button className="btn primary big" style={{ marginTop: 14 }} disabled={!info.detected || info.running || busy} onClick={preview}>{busy ? <Spinner /> : "LIMPIAR CACHÉ"}</button>
        </div></>}

      {stage === "preview" && <Modal title="Vista previa de la limpieza" actions={<><button className="btn" onClick={() => setStage("idle")}>Cancelar</button><button className="btn primary" disabled={files === 0} onClick={clean}>Eliminar {fmtBytes(total)}</button></>}>
        {targets.length === 0 ? <p>No hay carpetas de caché que limpiar.</p> : <table><thead><tr><th>CARPETA</th><th>ARCHIVOS</th><th>TAMAÑO</th></tr></thead><tbody>{targets.map(t => <tr key={t.name}><td><code>{t.name}</code></td><td>{t.files}</td><td>{fmtBytes(t.bytes)}</td></tr>)}</tbody></table>}
        <p style={{ color: "#aab2d0", fontSize: 12 }}>Se eliminarán {files} archivos. Esta acción no se puede deshacer; FiveM volverá a descargar la caché al conectarte.</p></Modal>}
      {stage === "running" && <Modal title="Limpiando…" actions={null}><div className="row" style={{ marginBottom: 10 }}><Spinner /> Eliminando archivos</div><Bar value={prog} /></Modal>}
      {stage === "done" && stats && <Modal title="444CFG — LIMPIEZA COMPLETADA" actions={<><button className="btn" onClick={() => setStage("idle")}>Cerrar</button><button className="btn primary" onClick={() => api.launchFivem().catch(e => { toast(errText(e), "err"); if (!info?.exe_found) choose(); })}>ABRIR FIVEM</button></>}>
        <p style={{ color: "#aab2d0" }}>Se han eliminado los archivos temporales seleccionados.</p>
        <div className="stat">Espacio liberado</div><div style={{ fontSize: 24 }}>{fmtBytes(stats.freed)}</div>
        <p style={{ fontSize: 12 }}>{stats.deleted} archivos eliminados{stats.skipped_links ? ` · ${stats.skipped_links} enlaces omitidos` : ""}.</p>
        {stats.errors.length > 0 && <div className="msg warn"><b>{stats.errors.length} errores</b> (archivos en uso o sin permiso):<br />{stats.errors.slice(0, 5).map((e, i) => <div key={i} className="mono">{e}</div>)}</div>}</Modal>}
    </Page>
  );
}
