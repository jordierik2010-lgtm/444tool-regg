import { useEffect, useState } from "react";
import { api, errText, type Gpu } from "../services/api";
import { Page, Spinner, useToast } from "../components/ui";

export default function GpuPage() {
  const toast = useToast();
  const [gpus, setGpus] = useState<Gpu[] | null>(null); const [err, setErr] = useState<string | null>(null); const [hags, setHags] = useState<number | null>(null);
  useEffect(() => { api.gpuInfo().then(setGpus).catch(e => { setErr(errText(e)); setGpus([]); }); api.hags().then(setHags).catch(() => {}); }, []);
  const open = (p: string) => api.openSettings(p).catch(e => toast(errText(e), "err"));
  return (
    <Page kicker="Optimización" title="NVIDIA / GPU" lead="Detección de tu GPU y accesos directos a los ajustes gráficos de Windows. Esta versión no modifica el panel de control de NVIDIA ni el Registro de la GPU.">
      {!gpus && <Spinner />}{err && <div className="msg err">{err}</div>}
      <div className="grid">{gpus?.map((g, i) => <div key={i} className="card">
        <div className="stat">{g.vendor}</div><h3 style={{ fontSize: 18 }}>{g.name}</h3>
        <table><tbody>
          <tr><th>FABRICANTE</th><td>{g.manufacturer || "—"}</td></tr><tr><th>CONTROLADOR</th><td>{g.driver_version ?? "—"}</td></tr>
          <tr><th>FECHA</th><td>{g.driver_date ?? "—"}</td></tr><tr><th>ESTADO</th><td>{g.status === "OK" ? "✓ Compatible / funcionando" : g.status ?? "Desconocido"}</td></tr></tbody></table>
      </div>)}</div>
      {gpus && gpus.length === 0 && !err && <div className="msg warn">No se detectó ninguna GPU.</div>}
      <div className="sect">AJUSTES DE WINDOWS</div>
      <div className="card"><h3>Programación de GPU acelerada por hardware</h3>
        <p>Estado actual: <b>{hags === 2 ? "Activada" : hags === 1 ? "Desactivada" : "No disponible / no expuesta"}</b> (solo lectura). Se cambia manualmente en Windows.</p>
        <div className="row"><button className="btn primary" onClick={() => open("display-advanced-graphics")}>Abrir configuración de gráficos</button><button className="btn" onClick={() => open("display")}>Pantalla</button><button className="btn" onClick={() => open("gaming-gamemode")}>Modo juego</button></div></div>
    </Page>
  );
}
