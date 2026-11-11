import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { api, fmtDate, openDiscord, type LicenseStatus, type SystemInfo, type Gpu } from "../services/api";
import { DiscordIcon, Page } from "../components/ui";
import type { PageId } from "../components/Shell";

export default function Home({ go, lic }: { go: (p: PageId) => void; lic: LicenseStatus }) {
  const [sys, setSys] = useState<SystemInfo | null>(null); const [gpus, setGpus] = useState<Gpu[] | null>(null);
  const [count, setCount] = useState(0); const [last, setLast] = useState<string | null>(null);
  useEffect(() => { api.systemInfo().then(setSys).catch(() => {}); api.gpuInfo().then(setGpus).catch(() => setGpus([])); api.appliedCount().then(setCount).catch(() => {}); api.lastOp().then(setLast).catch(() => {}); }, []);
  const S = ({ k, v }: { k: string; v: string }) => <div className="card"><div className="stat">{k}</div><div>{v}</div></div>;
  const cards: { id: PageId; t: string; d: string; i: string }[] = [
    { id: "movement", t: "Movement", d: "Ratón, teclado y planificación multimedia, con copia de seguridad.", i: "⌖" },
    { id: "gpu", t: "NVIDIA / GPU", d: "Detección de GPU y accesos a ajustes gráficos de Windows.", i: "▦" },
    { id: "fivem", t: "FiveM Optimizer", d: "Limpieza segura de caché de FiveM.", i: "✦" },
    { id: "effects", t: "App Effects", d: "Efectos animados de fondo para la aplicación.", i: "✧" }];
  return (
    <Page kicker="Panel principal" title="Bienvenido a 444CFG" lead="Herramienta local: todo ocurre en tu equipo. Cada cambio se registra y puede revertirse.">
      <div className="card row" style={{ gap: 20, marginBottom: 14 }}>
        <img src={logo} alt="444" width={84} height={84} style={{ objectFit: "contain", filter: "drop-shadow(0 0 18px rgba(var(--accent-rgb),.5))" }} />
        <div style={{ flex: 1 }}><div className="stat">Estado de licencia</div><div><span className="dot" />Activa · activada {fmtDate(lic.activated_at)}</div></div>
        <button className="btn" onClick={() => openDiscord()}><DiscordIcon /> Discord</button>
      </div>
      <div className="grid">
        <S k="CPU" v={sys ? `${sys.cpu} (${sys.cores} hilos)` : "…"} /><S k="GPU" v={gpus ? gpus.map(g => g.name).join(" · ") || "No detectada" : "…"} />
        <S k="RAM" v={sys ? `${sys.ram_gb} GB` : "…"} /><S k="Windows" v={sys ? sys.os : "…"} />
        <S k="Ajustes Movement activos" v={String(count)} /><S k="Última operación" v={last ?? "Ninguna todavía"} />
      </div>
      <div className="sect">ACCESOS DIRECTOS</div>
      <div className="grid">{cards.map(c => <div key={c.id} className="card hover"><div style={{ fontSize: 22, color: "var(--accent)" }}>{c.i}</div><h3>{c.t}</h3><p>{c.d}</p><button className="btn primary sm" onClick={() => go(c.id)}>Abrir</button></div>)}</div>
    </Page>
  );
}
