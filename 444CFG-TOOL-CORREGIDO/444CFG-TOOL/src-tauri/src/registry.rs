//! Movement tweaks. Only the vetted allow-list below can ever be written; every write is backed up first
//! (including "value did not exist"), verified by reading back, and restorable from the backup.
use crate::{license, store};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Copy, PartialEq, Debug)] pub enum Hive { User, Machine }
#[derive(Clone, Copy, Debug)] pub enum Val { Str(&'static str), Dword(u32) }

pub struct Tweak {
    pub id: &'static str, pub category: &'static str, pub hive: Hive,
    pub path: &'static str, pub name: &'static str, pub value: Val,
    pub label: &'static str, pub note: &'static str,
}
const MM: &str = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile";
const MM_GAMES: &str = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games";

/// Selected from 444cfg1-8.reg. Excluded and why: see README ("Análisis de los .reg").
pub const TWEAKS: &[Tweak] = &[
    Tweak { id: "mouse_speed", category: "Mouse", hive: Hive::User, path: "Control Panel\\Mouse", name: "MouseSpeed", value: Val::Str("0"),
        label: "Desactivar aceleración del puntero", note: "Equivale a desmarcar 'Mejorar la precisión del puntero'." },
    Tweak { id: "mouse_t1", category: "Mouse", hive: Hive::User, path: "Control Panel\\Mouse", name: "MouseThreshold1", value: Val::Str("0"),
        label: "Umbral de aceleración 1 = 0", note: "Parte de la desactivación de la aceleración." },
    Tweak { id: "mouse_t2", category: "Mouse", hive: Hive::User, path: "Control Panel\\Mouse", name: "MouseThreshold2", value: Val::Str("0"),
        label: "Umbral de aceleración 2 = 0", note: "Parte de la desactivación de la aceleración." },
    Tweak { id: "kbd_delay", category: "Keyboard", hive: Hive::User, path: "Control Panel\\Keyboard", name: "KeyboardDelay", value: Val::Str("0"),
        label: "Retardo de repetición mínimo", note: "Rango válido 0-3 (0 = más corto)." },
    Tweak { id: "kbd_speed", category: "Keyboard", hive: Hive::User, path: "Control Panel\\Keyboard", name: "KeyboardSpeed", value: Val::Str("31"),
        label: "Velocidad de repetición máxima", note: "El .reg original usaba 50, fuera del rango válido 0-31; se corrige a 31." },
    Tweak { id: "sys_resp", category: "System", hive: Hive::Machine, path: MM, name: "SystemResponsiveness", value: Val::Dword(10),
        label: "SystemResponsiveness = 10", note: "Reserva de CPU para tareas en segundo plano (por defecto 20). Requiere administrador." },
    Tweak { id: "games_prio", category: "System", hive: Hive::Machine, path: MM_GAMES, name: "Priority", value: Val::Dword(6),
        label: "Prioridad de tarea 'Games' = 6", note: "Dentro del rango 1-8 del planificador multimedia. Requiere administrador." },
    Tweak { id: "games_sfio", category: "System", hive: Hive::Machine, path: MM_GAMES, name: "SFIO Priority", value: Val::Str("High"),
        label: "Prioridad de E/S de 'Games' = High", note: "Valor documentado del planificador multimedia. Requiere administrador." },
];

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(tag = "kind")]
pub enum Orig { Missing, Str { v: String }, Dword { v: u32 } }

#[derive(Serialize, Deserialize, Clone)]
pub struct BackupEntry { pub id: String, pub original: Orig, pub applied: bool }
#[derive(Serialize, Deserialize, Default, Clone)]
pub struct Backup { pub created_at: u64, pub entries: Vec<BackupEntry> }

#[derive(Serialize)]
pub struct TweakInfo { pub id: &'static str, pub category: &'static str, pub label: &'static str, pub note: &'static str,
    pub target: String, pub new_value: String, pub current: String, pub needs_admin: bool, pub applied: bool }
#[derive(Serialize)]
pub struct StepResult { pub id: String, pub label: String, pub ok: bool, pub error: Option<String> }
#[derive(Serialize)]
pub struct Report { pub results: Vec<StepResult>, pub all_ok: bool, pub reboot_recommended: bool }
#[derive(Serialize, Clone)]
struct Progress { done: usize, total: usize }

fn fmt_val(v: &Val) -> String { match v { Val::Str(s) => format!("\"{s}\""), Val::Dword(d) => format!("0x{d:08x}") } }
fn fmt_orig(o: &Orig) -> String { match o { Orig::Missing => "(no existía)".into(), Orig::Str { v } => format!("\"{v}\""), Orig::Dword { v } => format!("0x{v:08x}") } }
fn hive_name(h: Hive) -> &'static str { if h == Hive::User { "HKCU" } else { "HKLM" } }

// ---- platform layer -------------------------------------------------------------------------------
#[cfg(windows)]
mod sys {
    use super::*;
    use winreg::{enums::*, RegKey, RegValue};
    fn root(h: Hive) -> RegKey { RegKey::predef(if h == Hive::User { HKEY_CURRENT_USER } else { HKEY_LOCAL_MACHINE }) }
    pub fn read(t: &Tweak) -> Result<Orig, String> {
        let k = match root(t.hive).open_subkey_with_flags(t.path, KEY_READ | KEY_WOW64_64KEY) {
            Ok(k) => k, Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Orig::Missing), Err(e) => return Err(e.to_string()) };
        match k.get_raw_value(t.name) {
            Ok(raw) => match raw.vtype {
                REG_SZ => k.get_value::<String, _>(t.name).map(|v| Orig::Str { v }).map_err(|e| e.to_string()),
                REG_DWORD => k.get_value::<u32, _>(t.name).map(|v| Orig::Dword { v }).map_err(|e| e.to_string()),
                _ => Err("tipo de valor inesperado; se omite por seguridad".into()) },
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Orig::Missing),
            Err(e) => Err(e.to_string()) }
    }
    pub fn write(t: &Tweak, v: &Orig) -> Result<(), String> {
        let (k, _) = root(t.hive).create_subkey_with_flags(t.path, KEY_READ | KEY_WRITE | KEY_WOW64_64KEY).map_err(|e| e.to_string())?;
        match v {
            Orig::Str { v } => k.set_value(t.name, v).map_err(|e| e.to_string()),
            Orig::Dword { v } => k.set_value(t.name, v).map_err(|e| e.to_string()),
            Orig::Missing => match k.delete_value(t.name) { Ok(()) => Ok(()), Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()), Err(e) => Err(e.to_string()) } }
    }
    pub fn is_admin() -> bool {
        root(Hive::Machine).open_subkey_with_flags(super::MM, KEY_WRITE | KEY_WOW64_64KEY).is_ok()
    }
    #[allow(dead_code)] fn _unused(_: RegValue) {}
}
#[cfg(not(windows))]
mod sys {
    use super::*;
    pub fn read(_: &Tweak) -> Result<Orig, String> { Err("Solo disponible en Windows".into()) }
    pub fn write(_: &Tweak, _: &Orig) -> Result<(), String> { Err("Solo disponible en Windows".into()) }
    pub fn is_admin() -> bool { false }
}

fn target_val(t: &Tweak) -> Orig { match t.value { Val::Str(s) => Orig::Str { v: s.into() }, Val::Dword(d) => Orig::Dword { v: d } } }
fn find(id: &str) -> Option<&'static Tweak> { TWEAKS.iter().find(|t| t.id == id) }

// ---- pure planning logic (unit tested) ------------------------------------------------------------
/// Keeps the FIRST backup of each id so re-applying never overwrites the true original.
pub fn merge_backup(mut b: Backup, new: Vec<(String, Orig)>, ts: u64) -> Backup {
    if b.entries.is_empty() { b.created_at = ts; }
    for (id, o) in new { if !b.entries.iter().any(|e| e.id == id) { b.entries.push(BackupEntry { id, original: o, applied: false }); } }
    b
}

// ---- commands -------------------------------------------------------------------------------------
#[tauri::command]
pub fn list_tweaks(app: AppHandle) -> Result<Vec<TweakInfo>, String> {
    let b: Backup = store::read(&app, "movement_backup.json").unwrap_or_default();
    Ok(TWEAKS.iter().map(|t| TweakInfo {
        id: t.id, category: t.category, label: t.label, note: t.note,
        target: format!("{}\\{} \\ {}", hive_name(t.hive), t.path, t.name), new_value: fmt_val(&t.value),
        current: sys::read(t).map(|o| fmt_orig(&o)).unwrap_or_else(|e| format!("error: {e}")),
        needs_admin: t.hive == Hive::Machine,
        applied: b.entries.iter().any(|e| e.id == t.id && e.applied),
    }).collect())
}

#[tauri::command]
pub fn is_elevated() -> bool { sys::is_admin() }

#[tauri::command]
pub fn apply_movement(app: AppHandle) -> Result<Report, String> {
    license::require_license(&app)?;
    if TWEAKS.iter().any(|t| t.hive == Hive::Machine) && !sys::is_admin() {
        return Err("NEEDS_ADMIN: algunos ajustes necesitan permisos de administrador.".into());
    }
    let total = TWEAKS.len();
    let mut snapshot = vec![];
    for t in TWEAKS { snapshot.push((t.id.to_string(), sys::read(t).map_err(|e| format!("No se pudo leer {}: {e}", t.name))?)); }
    let mut backup = merge_backup(store::read(&app, "movement_backup.json").unwrap_or_default(), snapshot, store::now());
    store::write(&app, "movement_backup.json", &backup)?; // backup BEFORE touching anything
    let mut results = vec![];
    for (i, t) in TWEAKS.iter().enumerate() {
        let want = target_val(t);
        let r = sys::write(t, &want).and_then(|_| match sys::read(t)? { ref got if *got == want => Ok(()), got => Err(format!("verificación fallida (leído {})", fmt_orig(&got))) });
        if r.is_ok() { if let Some(e) = backup.entries.iter_mut().find(|e| e.id == t.id) { e.applied = true; } }
        results.push(StepResult { id: t.id.into(), label: t.label.into(), ok: r.is_ok(), error: r.err() });
        let _ = app.emit("movement-progress", Progress { done: i + 1, total });
    }
    store::write(&app, "movement_backup.json", &backup)?;
    let ok = results.iter().filter(|r| r.ok).count();
    store::log(&app, &format!("Movement aplicado: {ok}/{total} ajustes verificados"));
    Ok(Report { all_ok: ok == total, reboot_recommended: ok > 0, results })
}

#[tauri::command]
pub fn restore_movement(app: AppHandle) -> Result<Report, String> {
    license::require_license(&app)?;
    let mut backup: Backup = store::read(&app, "movement_backup.json").ok_or("No hay copia de seguridad que restaurar.")?;
    let applied: Vec<BackupEntry> = backup.entries.iter().filter(|e| e.applied).cloned().collect();
    if applied.iter().any(|e| find(&e.id).map(|t| t.hive == Hive::Machine).unwrap_or(false)) && !sys::is_admin() {
        return Err("NEEDS_ADMIN: restaurar ajustes del sistema requiere administrador.".into());
    }
    let total = applied.len();
    let mut results = vec![];
    for (i, e) in applied.iter().enumerate() {
        let Some(t) = find(&e.id) else { continue };
        let r = sys::write(t, &e.original).and_then(|_| match sys::read(t)? { ref got if *got == e.original => Ok(()), got => Err(format!("verificación fallida (leído {})", fmt_orig(&got))) });
        if r.is_ok() { if let Some(b) = backup.entries.iter_mut().find(|b| b.id == e.id) { b.applied = false; } }
        results.push(StepResult { id: e.id.clone(), label: t.label.into(), ok: r.is_ok(), error: r.err() });
        let _ = app.emit("movement-progress", Progress { done: i + 1, total });
    }
    let all_ok = results.iter().all(|r| r.ok);
    if all_ok { store::remove(&app, "movement_backup.json"); } else { store::write(&app, "movement_backup.json", &backup)?; }
    store::log(&app, &format!("Movement restaurado: {}/{} valores", results.iter().filter(|r| r.ok).count(), total));
    Ok(Report { all_ok, reboot_recommended: !results.is_empty(), results })
}

#[tauri::command]
pub fn applied_count(app: AppHandle) -> usize {
    store::read::<Backup>(&app, "movement_backup.json").map(|b| b.entries.iter().filter(|e| e.applied).count()).unwrap_or(0)
}

#[tauri::command]
pub fn relaunch_as_admin(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let cmd = format!("Start-Process -FilePath '{}' -Verb RunAs", exe.display().to_string().replace('\'', "''"));
        std::process::Command::new("powershell").args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &cmd])
            .creation_flags(0x0800_0000).spawn().map_err(|e| e.to_string())?;
        app.exit(0);
        Ok(())
    }
    #[cfg(not(windows))] { let _ = app; Err("Solo Windows".into()) }
}

#[tauri::command]
pub fn restart_windows() -> Result<(), String> {
    // Frontend asks for a second explicit confirmation before calling this. 30 s grace period; cancellable with `shutdown /a`.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("shutdown").args(["/r", "/t", "30", "/c", "444CFG TOOL: reinicio solicitado por el usuario"])
            .creation_flags(0x0800_0000).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))] Err("Solo Windows".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn allowlist_ids_unique_and_valid() {
        for (i, a) in TWEAKS.iter().enumerate() { assert!(TWEAKS.iter().skip(i + 1).all(|b| b.id != a.id)); assert!(!a.name.is_empty()); }
    }
    #[test] fn keyboard_values_in_documented_range() {
        for t in TWEAKS.iter().filter(|t| t.id == "kbd_speed" || t.id == "kbd_delay") {
            let Val::Str(s) = t.value else { panic!() }; let n: u32 = s.parse().unwrap();
            assert!(if t.id == "kbd_speed" { n <= 31 } else { n <= 3 });
        }
    }
    #[test] fn no_accessibility_or_third_party_keys() {
        assert!(TWEAKS.iter().all(|t| !t.path.contains("Accessibility") && !t.path.contains("AFD") && !t.path.contains("kbdclass")));
    }
    #[test] fn first_backup_is_never_overwritten() {
        let b = merge_backup(Backup::default(), vec![("a".into(), Orig::Missing)], 1);
        let b = merge_backup(b, vec![("a".into(), Orig::Str { v: "x".into() }), ("b".into(), Orig::Dword { v: 5 })], 2);
        assert_eq!(b.created_at, 1); assert_eq!(b.entries.len(), 2); assert_eq!(b.entries[0].original, Orig::Missing);
    }
}
