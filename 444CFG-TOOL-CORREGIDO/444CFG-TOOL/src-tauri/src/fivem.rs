//! FiveM cache cleaner. Native reimplementation of limpiar_cache_444_cfg.bat with path validation.
//! Never touches Prefetch, Windows\Temp, mods, settings, GTA V files or anything outside the allow-listed folders.
use crate::{license, store};
use serde::Serialize;
use std::{fs, path::{Path, PathBuf}};
use sysinfo::System;
use tauri::{AppHandle, Emitter};

const CACHE_DIRS: [&str; 3] = ["cache", "server-cache", "server-cache-priv"];
const NUI_DIR: &str = "nui-storage";

fn is_reparse(md: &fs::Metadata) -> bool {
    #[cfg(windows)] { use std::os::windows::fs::MetadataExt; md.file_attributes() & 0x400 != 0 }
    #[cfg(not(windows))] { md.file_type().is_symlink() }
}

/// A valid root is a directory that contains `FiveM.app\data`, is not a reparse point, and is not a drive root.
pub fn validate_root(root: &Path) -> Result<PathBuf, String> {
    let md = fs::symlink_metadata(root).map_err(|_| "La ruta no existe.".to_string())?;
    if !md.is_dir() || is_reparse(&md) { return Err("La ruta no es una carpeta válida (enlaces simbólicos no permitidos).".into()); }
    let canon = fs::canonicalize(root).map_err(|e| e.to_string())?;
    if canon.parent().is_none() { return Err("No se permite una raíz de unidad.".into()); }
    let app_dir = canon.join("FiveM.app");
    let app_md = fs::symlink_metadata(&app_dir).map_err(|_| "Falta FiveM.app.".to_string())?;
    if !app_md.is_dir() || is_reparse(&app_md) { return Err("FiveM.app no puede ser un enlace simbólico.".into()); }
    let data = app_dir.join("data");
    let dmd = fs::symlink_metadata(&data).map_err(|_| "No parece una instalación de FiveM (falta FiveM.app\\data).".to_string())?;
    if !dmd.is_dir() || is_reparse(&dmd) { return Err("FiveM.app\\data no es una carpeta normal.".into()); }
    Ok(canon)
}
pub fn default_root() -> Option<PathBuf> { std::env::var_os("LOCALAPPDATA").map(|p| PathBuf::from(p).join("FiveM")) }
fn resolve_root(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(p) = store::settings(app).fivem_path { return validate_root(Path::new(&p)); }
    validate_root(&default_root().ok_or("No se encontró LOCALAPPDATA.")?)
}

#[derive(Serialize, Clone)]
pub struct Target { pub name: String, pub path: String, pub files: u64, pub bytes: u64, pub is_nui: bool }

/// Resolves allow-listed targets that exist, rejecting any that are reparse points or escape the data dir.
pub fn targets(root: &Path, include_nui: bool) -> Result<Vec<Target>, String> {
    let data = fs::canonicalize(root.join("FiveM.app").join("data")).map_err(|e| e.to_string())?;
    let mut names: Vec<(&str, bool)> = CACHE_DIRS.iter().map(|n| (*n, false)).collect();
    if include_nui { names.push((NUI_DIR, true)); }
    let mut out = vec![];
    for (n, nui) in names {
        let p = data.join(n);
        let Ok(md) = fs::symlink_metadata(&p) else { continue };
        if is_reparse(&md) || !md.is_dir() { return Err(format!("'{n}' es un enlace o no es una carpeta; limpieza cancelada por seguridad.")); }
        let canon = fs::canonicalize(&p).map_err(|e| e.to_string())?;
        if canon.parent() != Some(data.as_path()) { return Err(format!("'{n}' apunta fuera de la carpeta de datos de FiveM.")); }
        let (files, bytes) = scan(&canon);
        out.push(Target { name: n.into(), path: canon.display().to_string(), files, bytes, is_nui: nui });
    }
    Ok(out)
}

pub fn scan(dir: &Path) -> (u64, u64) {
    let (mut f, mut b) = (0, 0);
    let Ok(rd) = fs::read_dir(dir) else { return (0, 0) };
    for e in rd.flatten() {
        let Ok(md) = fs::symlink_metadata(e.path()) else { continue };
        if is_reparse(&md) { continue; }
        if md.is_dir() { let (x, y) = scan(&e.path()); f += x; b += y; } else { f += 1; b += md.len(); }
    }
    (f, b)
}

#[derive(Default, Serialize, Clone)]
pub struct CleanStats { pub deleted: u64, pub freed: u64, pub errors: Vec<String>, pub skipped_links: u64 }

/// Deletes contents of `dir` (not `dir` itself). Reparse points are skipped, never followed.
pub fn clean_dir(dir: &Path, st: &mut CleanStats, on_file: &mut dyn FnMut(&CleanStats)) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        let Ok(md) = fs::symlink_metadata(e.path()) else { continue };
        if is_reparse(&md) { st.skipped_links += 1; continue; }
        if md.is_dir() {
            clean_dir(&p, st, on_file);
            let _ = fs::remove_dir(&p); // only succeeds when empty
        } else {
            match fs::remove_file(&p) {
                Ok(()) => { st.deleted += 1; st.freed += md.len(); }
                Err(err) => { if st.errors.len() < 50 { st.errors.push(format!("{}: {err}", p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default())); } }
            }
            if st.deleted % 25 == 0 { on_file(st); }
        }
    }
}

fn fivem_running() -> bool {
    let mut s = System::new(); s.refresh_processes();
    s.processes().values().any(|p| p.name().to_lowercase().starts_with("fivem"))
}

#[derive(Serialize)]
pub struct FivemInfo { pub detected: bool, pub path: Option<String>, pub custom: bool, pub error: Option<String>,
    pub cache_bytes: u64, pub nui_bytes: u64, pub last_clean_ts: Option<u64>, pub last_freed_bytes: Option<u64>, pub running: bool, pub exe_found: bool }

#[tauri::command]
pub fn fivem_info(app: AppHandle) -> FivemInfo {
    let s = store::settings(&app);
    let running = fivem_running();
    match resolve_root(&app) {
        Ok(root) => {
            let t = targets(&root, true).unwrap_or_default();
            FivemInfo { detected: true, path: Some(root.display().to_string()), custom: s.fivem_path.is_some(), error: None,
                cache_bytes: t.iter().filter(|x| !x.is_nui).map(|x| x.bytes).sum(), nui_bytes: t.iter().filter(|x| x.is_nui).map(|x| x.bytes).sum(),
                last_clean_ts: s.last_clean_ts, last_freed_bytes: s.last_freed_bytes, running, exe_found: root.join("FiveM.exe").is_file() }
        }
        Err(e) => FivemInfo { detected: false, custom: s.fivem_path.is_some(), path: s.fivem_path.clone(), error: Some(e), cache_bytes: 0, nui_bytes: 0,
            last_clean_ts: s.last_clean_ts, last_freed_bytes: s.last_freed_bytes, running, exe_found: false },
    }
}

#[tauri::command]
pub fn set_fivem_path(app: AppHandle, path: Option<String>) -> Result<(), String> {
    let mut s = store::settings(&app);
    s.fivem_path = match path { Some(p) => Some(validate_root(Path::new(&p))?.display().to_string()), None => None };
    store::save_settings(&app, &s)
}

#[tauri::command]
pub fn fivem_preview(app: AppHandle, include_nui: bool) -> Result<Vec<Target>, String> {
    license::require_license(&app)?;
    targets(&resolve_root(&app)?, include_nui)
}

#[derive(Serialize, Clone)] struct CleanProgress { done: u64, total: u64 }

#[tauri::command]
pub async fn fivem_clean(app: AppHandle, include_nui: bool) -> Result<CleanStats, String> {
    license::require_license(&app)?;
    if fivem_running() { return Err("FiveM está abierto. Ciérralo antes de limpiar la caché.".into()); }
    let root = resolve_root(&app)?;
    let list = targets(&root, include_nui)?;
    let total: u64 = list.iter().map(|t| t.files).sum();
    let a2 = app.clone();
    let stats = tauri::async_runtime::spawn_blocking(move || {
        let mut st = CleanStats::default();
        for t in list {
            let mut cb = |s: &CleanStats| { let _ = a2.emit("clean-progress", CleanProgress { done: s.deleted, total }); };
            clean_dir(Path::new(&t.path), &mut st, &mut cb);
        }
        let _ = a2.emit("clean-progress", CleanProgress { done: st.deleted, total });
        st
    }).await.map_err(|e| e.to_string())?;
    let mut s = store::settings(&app); s.last_clean_ts = Some(store::now()); s.last_freed_bytes = Some(stats.freed); store::save_settings(&app, &s)?;
    store::log(&app, &format!("Caché FiveM limpiada: {} archivos, {} bytes, {} errores", stats.deleted, stats.freed, stats.errors.len()));
    Ok(stats)
}

#[tauri::command]
pub fn launch_fivem(app: AppHandle) -> Result<(), String> {
    let root = resolve_root(&app)?;
    let exe = root.join("FiveM.exe");
    if !exe.is_file() { return Err("No se encontró FiveM.exe. Selecciona la carpeta de FiveM manualmente.".into()); }
    std::process::Command::new(&exe).current_dir(&root).spawn().map_err(|e| format!("No se pudo abrir FiveM: {e}"))?;
    store::log(&app, "FiveM iniciado");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn mk(root: &Path, rel: &str, bytes: usize) { let p = root.join(rel); fs::create_dir_all(p.parent().unwrap()).unwrap(); fs::write(p, vec![1u8; bytes]).unwrap(); }
    #[test] fn cleans_only_allowlisted_and_keeps_siblings() {
        let d = tempfile::tempdir().unwrap(); let r = d.path().join("FiveM");
        mk(&r, "FiveM.app/data/cache/a/b.bin", 100); mk(&r, "FiveM.app/data/cache/c.bin", 50);
        mk(&r, "FiveM.app/data/server-cache/x", 10); mk(&r, "FiveM.app/data/nui-storage/n", 7);
        mk(&r, "FiveM.app/mods/keep.rpf", 9); mk(&r, "FiveM.app/data/other/keep", 3); mk(&r, "FiveM.app/CitizenFX.ini", 1);
        let root = validate_root(&r).unwrap();
        let t = targets(&root, false).unwrap(); assert_eq!(t.len(), 2); assert!(t.iter().all(|x| !x.is_nui));
        let mut st = CleanStats::default();
        for x in &t { clean_dir(Path::new(&x.path), &mut st, &mut |_| {}); }
        assert_eq!(st.deleted, 3); assert_eq!(st.freed, 160);
        assert!(r.join("FiveM.app/mods/keep.rpf").exists() && r.join("FiveM.app/data/other/keep").exists());
        assert!(r.join("FiveM.app/data/nui-storage/n").exists(), "nui-storage must be opt-in");
        assert!(r.join("FiveM.app/data/cache").is_dir(), "target root folder is kept");
    }
    #[test] fn nui_only_when_requested() {
        let d = tempfile::tempdir().unwrap(); let r = d.path().join("FiveM"); mk(&r, "FiveM.app/data/nui-storage/n", 7);
        let root = validate_root(&r).unwrap(); assert_eq!(targets(&root, true).unwrap().len(), 1); assert_eq!(targets(&root, false).unwrap().len(), 0);
    }
    #[test] fn rejects_non_fivem_dirs() {
        let d = tempfile::tempdir().unwrap(); assert!(validate_root(d.path()).is_err());
        assert!(validate_root(&d.path().join("missing")).is_err());
    }
    #[cfg(unix)] #[test] fn symlinked_target_is_refused_and_not_followed() {
        let d = tempfile::tempdir().unwrap(); let r = d.path().join("FiveM"); let outside = d.path().join("outside"); mk(&outside, "precious.txt", 5);
        fs::create_dir_all(r.join("FiveM.app/data")).unwrap();
        std::os::unix::fs::symlink(&outside, r.join("FiveM.app/data/cache")).unwrap();
        let root = validate_root(&r).unwrap(); assert!(targets(&root, false).is_err());
        assert!(outside.join("precious.txt").exists());
    }
}
