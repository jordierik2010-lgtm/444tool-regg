//! Real hardware / OS information. No invented values: anything unreadable is returned as null.
use serde::Serialize;
use sysinfo::System;

#[derive(Serialize)]
pub struct SystemInfo { pub cpu: String, pub cores: usize, pub ram_gb: f64, pub os: String, pub build: Option<u32>, pub windows11: bool, pub hostname: Option<String> }
#[derive(Serialize, Clone)]
pub struct Gpu { pub name: String, pub vendor: String, pub manufacturer: String, pub driver_version: Option<String>, pub driver_date: Option<String>, pub status: Option<String> }

#[cfg(windows)]
fn build_number() -> Option<u32> {
    use winreg::{enums::*, RegKey};
    RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion", KEY_READ | KEY_WOW64_64KEY).ok()?
        .get_value::<String, _>("CurrentBuildNumber").ok()?.parse().ok()
}
#[cfg(not(windows))] fn build_number() -> Option<u32> { None }

#[tauri::command]
pub fn system_info() -> SystemInfo {
    let mut s = System::new(); s.refresh_cpu(); s.refresh_memory();
    let build = build_number();
    let win11 = build.map(|b| b >= 22000).unwrap_or(false);
    let base = System::long_os_version().unwrap_or_else(|| "Desconocido".into());
    SystemInfo { cpu: s.cpus().first().map(|c| c.brand().trim().to_string()).unwrap_or_default(), cores: s.cpus().len(),
        ram_gb: (s.total_memory() as f64 / 1_073_741_824.0 * 10.0).round() / 10.0,
        os: match build { Some(b) => format!("{base} (build {b})"), None => base }, build, windows11: win11, hostname: System::host_name() }
}

#[tauri::command]
pub fn gpu_info() -> Result<Vec<Gpu>, String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let script = "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,DriverVersion,@{n='DriverDate';e={$_.DriverDate.ToString('yyyy-MM-dd')}},Status | ConvertTo-Json -Compress";
        let out = std::process::Command::new("powershell").args(["-NoProfile", "-NonInteractive", "-Command", script]).creation_flags(0x0800_0000)
            .output().map_err(|e| format!("No se pudo consultar la GPU: {e}"))?;
        if !out.status.success() { return Err("La consulta de GPU falló.".into()); }
        let v: serde_json::Value = serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;
        let items = if v.is_array() { v.as_array().cloned().unwrap_or_default() } else { vec![v] };
        let g = |o: &serde_json::Value, k: &str| o.get(k).and_then(|x| x.as_str()).map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        return Ok(items.iter().map(|o| {
            let name = g(o, "Name").unwrap_or_default(); let manu = g(o, "AdapterCompatibility").unwrap_or_default();
            let l = format!("{name} {manu}").to_lowercase();
            let vendor = if l.contains("nvidia") { "NVIDIA" } else if l.contains("amd") || l.contains("radeon") || l.contains("advanced micro") { "AMD" } else if l.contains("intel") { "Intel" } else { "Otro" };
            Gpu { name, vendor: vendor.into(), manufacturer: manu, driver_version: g(o, "DriverVersion"), driver_date: g(o, "DriverDate"), status: g(o, "Status") }
        }).collect());
    }
    #[cfg(not(windows))] Err("Solo disponible en Windows".into())
}

/// Read-only: Hardware-accelerated GPU scheduling state (HwSchMode: 2 = on, 1 = off). Not modified by the app.
#[tauri::command]
pub fn hags_state() -> Option<u32> {
    #[cfg(windows)]
    { use winreg::{enums::*, RegKey};
      RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey_with_flags("SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers", KEY_READ | KEY_WOW64_64KEY).ok()?.get_value::<u32, _>("HwSchMode").ok() }
    #[cfg(not(windows))] None
}

#[tauri::command]
pub fn open_windows_settings(page: String) -> Result<(), String> {
    const ALLOWED: [&str; 3] = ["display-advanced-graphics", "display", "gaming-gamemode"];
    if !ALLOWED.contains(&page.as_str()) { return Err("Página no permitida.".into()); }
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt;
      std::process::Command::new("explorer.exe").arg(format!("ms-settings:{page}")).creation_flags(0x0800_0000).spawn().map(|_| ()).map_err(|e| e.to_string()) }
    #[cfg(not(windows))] Err("Solo Windows".into())
}
