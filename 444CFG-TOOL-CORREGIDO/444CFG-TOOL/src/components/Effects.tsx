import { useEffect, useRef } from "react";

export type EffectName = "none" | "snow" | "rain" | "stars" | "particles" | "smoke" | "glow";
export const EFFECTS: { id: EffectName; name: string; desc: string }[] = [
  { id: "snow", name: "Nieve", desc: "Copos blancos cayendo suavemente." },
  { id: "rain", name: "Lluvia", desc: "Gotas finas y rápidas." },
  { id: "stars", name: "Estrellas", desc: "Puntos que aparecen y se desvanecen." },
  { id: "particles", name: "Partículas", desc: "Luces del color del tema, a la deriva." },
  { id: "smoke", name: "Humo sutil", desc: "Neblina translúcida." },
  { id: "glow", name: "Brillos", desc: "Destellos que laten." },
  { id: "none", name: "Ninguno", desc: "Sin efecto de fondo." },
];
type P = { x: number; y: number; r: number; v: number; a: number; p: number };
const DENSITY: Record<EffectName, number> = { none: 0, snow: 110, rain: 150, stars: 130, particles: 60, smoke: 6, glow: 35 };

export const prefersReducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Effects({ effect, intensity, speed, lowPower, className }: { effect: EffectName; intensity: number; speed: number; lowPower: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || effect === "none" || prefersReducedMotion()) { cv?.getContext("2d")?.clearRect(0, 0, cv.width, cv.height); return; }
    const ctx = cv.getContext("2d")!;
    const dpr = lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim() || "142,157,224";
    let w = 0, h = 0, raf = 0, last = 0, ps: P[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const seed = () => {
      const n = Math.max(effect === "smoke" ? 4 : 12, Math.round(DENSITY[effect] * intensity * 2 * (lowPower ? 0.5 : 1) * Math.max(0.4, (w * h) / 1e6)));
      ps = Array.from({ length: n }, () => ({ x: rnd(0, w), y: rnd(0, h), r: effect === "smoke" ? rnd(120, 260) : rnd(0.6, 2.6), v: rnd(0.4, 1.4), a: rnd(0.2, 0.9), p: rnd(0, 6.28) }));
    };
    const resize = () => { const b = cv.getBoundingClientRect(); w = b.width; h = b.height; cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); seed(); };
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || (lowPower && t - last < 33)) return;
      const dt = Math.min(3, (t - last) / 16.67 || 1) * speed; last = t;
      ctx.clearRect(0, 0, w, h);
      for (const q of ps) {
        q.p += 0.02 * dt;
        switch (effect) {
          case "snow": q.y += q.v * q.r * 0.5 * dt + 0.3 * dt; q.x += Math.sin(q.p) * 0.4 * dt; ctx.fillStyle = `rgba(255,255,255,${q.a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 6.28); ctx.fill(); break;
          case "rain": q.y += (9 + q.v * 8) * dt; q.x -= 1.2 * dt; ctx.strokeStyle = `rgba(${rgb},${q.a * 0.45})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + 1.6, q.y - 10 - q.v * 6); ctx.stroke(); break;
          case "stars": ctx.fillStyle = `rgba(255,255,255,${(Math.sin(q.p) * 0.5 + 0.5) * q.a})`; ctx.fillRect(q.x, q.y, q.r, q.r); break;
          case "particles": q.x += Math.cos(q.p) * 0.3 * q.v * dt; q.y -= 0.25 * q.v * dt; ctx.fillStyle = `rgba(${rgb},${q.a * 0.8})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 0.4, 0, 6.28); ctx.fill(); break;
          case "smoke": { q.x += 0.12 * q.v * dt; q.y += Math.sin(q.p) * 0.1 * dt; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); g.addColorStop(0, `rgba(${rgb},0.07)`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); break; }
          case "glow": { const k = Math.sin(q.p) * 0.5 + 0.5; ctx.fillStyle = `rgba(${rgb},${k * 0.12})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 5, 0, 6.28); ctx.fill(); ctx.fillStyle = `rgba(255,255,255,${k * q.a})`; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.8, 0, 6.28); ctx.fill(); break; }
        }
        if (q.y > h + 20) { q.y = -20; q.x = rnd(0, w); } if (q.y < -20 && effect === "particles") { q.y = h + 10; } if (q.x > w + 300) q.x = -300; if (q.x < -20 && effect !== "smoke") q.x = w + 10;
      }
    };
    resize(); raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize); ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [effect, intensity, speed, lowPower]);
  return <canvas ref={ref} className={className ?? "fx-canvas"} aria-hidden="true" />;
}
