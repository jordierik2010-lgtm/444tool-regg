//! Small JSON persistence in the app data dir + operation log.
use serde::{de::DeserializeOwned, Serialize};
use std::{fs, io::Write, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager};

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&d).map_err(|e| format!("No se pudo crear la carpeta de datos: {e}"))?;
    Ok(d)
}
pub fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0) }

pub fn read<T: DeserializeOwned>(app: &AppHandle, name: &str) -> Option<T> {
    let p = data_dir(app).ok()?.join(name);
    serde_json::from_slice(&fs::read(p).ok()?).ok()
}
pub fn write<T: Serialize>(app: &AppHandle, name: &str, v: &T) -> Result<(), String> {
    let p = data_dir(app)?.join(name);
    let tmp = p.with_extension("tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(v).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &p).map_err(|e| e.to_string())
}
pub fn remove(app: &AppHandle, name: &str) { if let Ok(d) = data_dir(app) { let _ = fs::remove_file(d.join(name)); } }

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
pub struct Settings {
    pub fivem_path: Option<String>,
    pub last_clean_ts: Option<u64>,
    pub last_freed_bytes: Option<u64>,
    pub last_op: Option<String>,
    pub last_op_ts: Option<u64>,
}
pub fn settings(app: &AppHandle) -> Settings { read(app, "settings.json").unwrap_or_default() }
pub fn save_settings(app: &AppHandle, s: &Settings) -> Result<(), String> { write(app, "settings.json", s) }

/// Appends to operations.log and remembers the last operation.
pub fn log(app: &AppHandle, msg: &str) {
    if let Ok(d) = data_dir(app) {
        if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(d.join("operations.log")) {
            let _ = writeln!(f, "{} {}", now(), msg);
        }
    }
    let mut s = settings(app); s.last_op = Some(msg.to_string()); s.last_op_ts = Some(now()); let _ = save_settings(app, &s);
}
pub fn read_log(app: &AppHandle) -> Vec<String> {
    let Ok(d) = data_dir(app) else { return vec![] };
    let txt = fs::read_to_string(d.join("operations.log")).unwrap_or_default();
    let mut v: Vec<String> = txt.lines().map(|s| s.to_string()).collect();
    let n = v.len().saturating_sub(200); v.drain(..n); v
}
