import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { EffectName } from "../components/Effects";

export type Variant = "indigo" | "violeta" | "cobalto" | "cian";
export const VARIANTS: Record<Variant, { name: string; rgb: string; hex: string }> = {
  indigo: { name: "Índigo 444 (logo)", rgb: "142,157,224", hex: "#8e9de0" },
  violeta: { name: "Violeta", rgb: "170,140,230", hex: "#aa8ce6" },
  cobalto: { name: "Cobalto", rgb: "96,140,255", hex: "#608cff" },
  cian: { name: "Cian", rgb: "90,200,240", hex: "#5ac8f0" },
};
export type Prefs = { variant: Variant; animations: boolean; glow: boolean; compact: boolean; effect: EffectName; intensity: number; speed: number; lowPower: boolean };
export const DEFAULTS: Prefs = { variant: "indigo", animations: true, glow: true, compact: false, effect: "particles", intensity: 0.5, speed: 1, lowPower: false };
const KEY = "444cfg.prefs.v1";
type Ctx = { prefs: Prefs; set: (p: Partial<Prefs>) => void; reset: () => void };
const C = createContext<Ctx>(null as unknown as Ctx);
export const usePrefs = () => useContext(C);

const load = (): Prefs => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; } };

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
    const r = document.documentElement, v = VARIANTS[prefs.variant] ?? VARIANTS.indigo;
    r.style.setProperty("--accent-rgb", v.rgb); r.style.setProperty("--accent", v.hex);
    r.dataset.glow = String(prefs.glow); r.dataset.anim = String(prefs.animations); r.dataset.compact = String(prefs.compact);
  }, [prefs]);
  return <C.Provider value={{ prefs, set: p => setPrefs(s => ({ ...s, ...p })), reset: () => setPrefs(DEFAULTS) }}>{children}</C.Provider>;
}
