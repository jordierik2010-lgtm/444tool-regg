import { useState } from "react";
import { api, errText, fmtDate, type LicenseStatus } from "../services/api";
import { Modal, Page, useToast } from "../components/ui";

export default function License({ lic, onChange }: { lic: LicenseStatus; onChange: () => void }) {
  const toast = useToast(); const [replace, setReplace] = useState(false); const [key, setKey] = useState(""); const [err, setErr] = useState<string | null>(null);
  const submit = async () => { try { await api.activate(key); toast("Licencia reemplazada", "ok"); setReplace(false); setKey(""); onChange(); } catch (e) { setErr(errText(e)); } };
  return (
    <Page kicker="Sistema" title="Licencia" lead="La licencia está vinculada a este equipo y se verifica criptográficamente (Ed25519) cada vez que se inicia la aplicación y antes de cada operación.">
      <div className="grid">
        <div className="card"><div className="stat">Estado</div><div><span className={`dot ${lic.active ? "" : "off"}`} />{lic.active ? "Activa y verificada" : "No válida"}</div><div className="stat" style={{ marginTop: 10 }}>Activada</div><div>{fmtDate(lic.activated_at)}</div></div>
        <div className="card"><div className="stat">HWID</div><div className="mono" style={{ wordBreak: "break-all" }}>{lic.hwid}</div><button className="btn sm" style={{ marginTop: 10 }} onClick={() => navigator.clipboard.writeText(lic.hwid).then(() => toast("HWID copiado", "ok"))}>COPIAR HWID</button></div>
        <div className="card"><div className="stat">Producto</div><div>444CFG TOOL</div><div className="stat" style={{ marginTop: 10 }}>Tipo</div><div>Licencia offline por equipo</div></div>
      </div>
      <div className="row" style={{ marginTop: 16 }}><button className="btn" onClick={() => { setErr(null); setReplace(true); }}>Reemplazar licencia</button></div>
      {replace && <Modal title="Reemplazar licencia" actions={<><button className="btn" onClick={() => setReplace(false)}>Cancelar</button><button className="btn primary" disabled={!key.trim()} onClick={submit}>Verificar y guardar</button></>}>
        <p style={{ color: "#aab2d0" }}>La nueva clave se verifica antes de guardarse; si es inválida, se conserva la actual.</p>
        <input className="input" value={key} onChange={e => setKey(e.target.value)} placeholder="Nueva clave" spellCheck={false} />{err && <div className="msg err" style={{ marginTop: 10 }}>{err}</div>}</Modal>}
    </Page>
  );
}
