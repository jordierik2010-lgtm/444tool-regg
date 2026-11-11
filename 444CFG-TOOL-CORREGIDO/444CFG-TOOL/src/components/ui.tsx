import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type T = { id: number; text: string; kind: "ok" | "err" | "info" };
const ToastCtx = createContext<(text: string, kind?: T["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((text: string, kind: T["kind"] = "info") => {
    const id = Date.now() + Math.random(); setList(l => [...l, { id, text, kind }]);
    setTimeout(() => setList(l => l.filter(t => t.id !== id)), 4200);
  }, []);
  return <ToastCtx.Provider value={push}>{children}<div className="toasts" role="status">{list.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div></ToastCtx.Provider>;
}

export function Modal({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return <div className="overlay" role="dialog" aria-modal="true"><div className="modal"><h2>{title}</h2>{children}<div className="actions">{actions}</div></div></div>;
}
export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) =>
  <button className={`tgl ${on ? "on" : ""}`} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
export const Spinner = () => <span className="spin" />;
export const Bar = ({ value }: { value: number }) => <div className="bar"><div style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} /></div>;
export const Page = ({ kicker, title, lead, children }: { kicker: string; title: string; lead?: string; children: ReactNode }) =>
  <div className="page"><div className="kicker">{kicker}</div><h1>{title}</h1>{lead && <p className="lead">{lead}</p>}{children}</div>;
export const DiscordIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /></svg>;
