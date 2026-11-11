import { useEffect, useState } from "react";
import { api, APP_VERSION, errText, fmtBytes, fmtDate, openDiscord, type FivemInfo, type SystemInfo, type TweakInfo } from "../services/api";
import { DiscordIcon, Page, useToast } from "../components/ui";

export default function Settings() {
  const toast = useToast();
  const [sys, setSys] = useState<SystemInfo | null>(null); const [fv, setFv] = useState<FivemInfo | null>(null); const [log, setLog] = useState<string[]>([]);
  const [tw, setTw] = useState<TweakInfo[]>([]); const [folder, setFolder] = useState(""); const [admin, setAdmin] = useState(false);
  useEffect(() => { api.systemInfo().then(setSys).catch(() => {}); api.fivemInfo().then(setFv).catch(() => {}); api.log().then(setLog).catch(() => {}); api.tweaks().then(setTw).catch(() => {}); api.dataFolder().then(setFolder).catch(() => {}); api.isElevated().then(setAdmin).catch(() => {}); }, []);
  const R = ({ k, v }: { k: string; v: string }) => <tr><th>{k}</th><td>{v}</td></tr>;
  return (
    <Page kicker="Sistema" title="Configuración" lead="Información de la aplicación y del equipo, registro de operaciones y copias de seguridad.">
      <div className="grid">
        <div className="card"><h3>Aplicación</h3><table><tbody><R k="VERSIÓN" v={APP_VERSION} /><R k="DATOS" v={folder || "—"} /><R k="PERMISOS" v={admin ? "Administrador" : "Usuario estándar"} /></tbody></table>
          <button className="btn sm" style={{ marginTop: 10 }} onClick={() => openDiscord()}><DiscordIcon /> Ayuda en Discord</button></div>
        <div className="card"><h3>Equipo</h3>{sys ? <table><tbody><R k="CPU" v={sys.cpu} /><R k="RAM" v={`${sys.ram_gb} GB`} /><R k="WINDOWS" v={sys.os} /><R k="EQUIPO" v={sys.hostname ?? "—"} /></tbody></table> : "…"}</div>
        <div className="card"><h3>FiveM</h3>{fv ? <table><tbody><R k="RUTA" v={fv.path ?? "No detectada"} /><R k="CACHÉ" v={fmtBytes(fv.cache_bytes)} /><R k="LIMPIEZA" v={fmtDate(fv.last_clean_ts)} /></tbody></table> : "…"}</div>
      </div>
      <div className="sect">COPIAS DE SEGURIDAD · MOVEMENT</div>
      <div className="card"><p>{tw.some(t => t.applied) ? `${tw.filter(t => t.applied).length} ajustes aplicados con copia de seguridad guardada.` : "No hay cambios aplicados."} Restaura desde la página Movement.</p>
        <button className="btn sm" disabled={!tw.some(t => t.applied)} onClick={() => toast("Ve a Movement → RESTAURAR ORIGINAL", "info")}>¿Cómo restaurar?</button></div>
      <div className="sect">REGISTRO DE OPERACIONES</div>
      <div className="card"><div style={{ maxHeight: 220, overflow: "auto" }}>{log.length === 0 ? <span className="lead">Sin operaciones.</span> : [...log].reverse().map((l, i) => { const [ts, ...m] = l.split(" "); return <div key={i} className="mono">{fmtDate(+ts)} — {m.join(" ")}</div>; })}</div>
        <button className="btn sm" style={{ marginTop: 10 }} onClick={() => api.log().then(setLog).catch(e => toast(errText(e), "err"))}>Actualizar</button></div>
    </Page>
  );
}
