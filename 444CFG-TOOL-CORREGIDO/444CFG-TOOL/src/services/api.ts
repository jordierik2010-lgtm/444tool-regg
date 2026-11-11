import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

export const DISCORD_URL = "https://discord.gg/444cfg";
export const APP_VERSION = "1.0.0";

export type LicenseStatus = { active: boolean; hwid: string; activated_at: number | null; error: string | null };
export type SystemInfo = { cpu: string; cores: number; ram_gb: number; os: string; build: number | null; windows11: boolean; hostname: string | null };
export type Gpu = { name: string; vendor: string; manufacturer: string; driver_version: string | null; driver_date: string | null; status: string | null };
export type TweakInfo = { id: string; category: string; label: string; note: string; target: string; new_value: string; current: string; needs_admin: boolean; applied: boolean };
export type StepResult = { id: string; label: string; ok: boolean; error: string | null };
export type Report = { results: StepResult[]; all_ok: boolean; reboot_recommended: boolean };
export type FivemInfo = { detected: boolean; path: string | null; custom: boolean; error: string | null; cache_bytes: number; nui_bytes: number; last_clean_ts: number | null; last_freed_bytes: number | null; running: boolean; exe_found: boolean };
export type Target = { name: string; path: string; files: number; bytes: number; is_nui: boolean };
export type CleanStats = { deleted: number; freed: number; errors: string[]; skipped_links: number };

export const api = {
  hwid: () => invoke<string>("get_hwid"),
  licenseStatus: () => invoke<LicenseStatus>("license_status"),
  activate: (key: string) => invoke<LicenseStatus>("activate_license", { key }),
  deactivate: () => invoke<void>("deactivate_license"),
  systemInfo: () => invoke<SystemInfo>("system_info"),
  gpuInfo: () => invoke<Gpu[]>("gpu_info"),
  hags: () => invoke<number | null>("hags_state"),
  openSettings: (page: string) => invoke<void>("open_windows_settings", { page }),
  tweaks: () => invoke<TweakInfo[]>("list_tweaks"),
  isElevated: () => invoke<boolean>("is_elevated"),
  applyMovement: () => invoke<Report>("apply_movement"),
  restoreMovement: () => invoke<Report>("restore_movement"),
  appliedCount: () => invoke<number>("applied_count"),
  relaunchAdmin: () => invoke<void>("relaunch_as_admin"),
  restartWindows: () => invoke<void>("restart_windows"),
  fivemInfo: () => invoke<FivemInfo>("fivem_info"),
  setFivemPath: (path: string | null) => invoke<void>("set_fivem_path", { path }),
  fivemPreview: (includeNui: boolean) => invoke<Target[]>("fivem_preview", { includeNui }),
  fivemClean: (includeNui: boolean) => invoke<CleanStats>("fivem_clean", { includeNui }),
  launchFivem: () => invoke<void>("launch_fivem"),
  log: () => invoke<string[]>("operation_log"),
  lastOp: () => invoke<string | null>("last_operation"),
  dataFolder: () => invoke<string>("data_folder"),
};
export const onEvent = <T,>(name: string, cb: (p: T) => void) => listen<T>(name, e => cb(e.payload));
export const openDiscord = () => openUrl(DISCORD_URL);
export const pickFolder = async () => { const r = await openDialog({ directory: true, multiple: false }); return typeof r === "string" ? r : null; };
export const errText = (e: unknown) => String(e instanceof Error ? e.message : e).replace(/^NEEDS_ADMIN: /, "");
export const needsAdmin = (e: unknown) => String(e).includes("NEEDS_ADMIN");
export const fmtBytes = (n: number) => n >= 1073741824 ? (n / 1073741824).toFixed(2) + " GB" : n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : (n / 1024).toFixed(0) + " KB";
export const fmtDate = (ts: number | null) => (ts ? new Date(ts * 1000).toLocaleString() : "—");
