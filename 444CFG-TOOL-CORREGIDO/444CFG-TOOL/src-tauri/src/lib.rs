mod fivem;
mod hardware;
mod license;
mod registry;
mod store;

#[tauri::command]
fn operation_log(app: tauri::AppHandle) -> Vec<String> { store::read_log(&app) }
#[tauri::command]
fn last_operation(app: tauri::AppHandle) -> Option<String> { store::settings(&app).last_op }
#[tauri::command]
fn data_folder(app: tauri::AppHandle) -> Result<String, String> { store::data_dir(&app).map(|p| p.display().to_string()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            license::get_hwid, license::license_status, license::activate_license, license::deactivate_license,
            registry::list_tweaks, registry::is_elevated, registry::apply_movement, registry::restore_movement,
            registry::applied_count, registry::relaunch_as_admin, registry::restart_windows,
            fivem::fivem_info, fivem::set_fivem_path, fivem::fivem_preview, fivem::fivem_clean, fivem::launch_fivem,
            hardware::system_info, hardware::gpu_info, hardware::hags_state, hardware::open_windows_settings,
            operation_log, last_operation, data_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running 444CFG TOOL");
}
