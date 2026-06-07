mod codex;
mod codex_usage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      app.handle().plugin(
        tauri_plugin_log::Builder::default()
          .level(if cfg!(debug_assertions) {
            log::LevelFilter::Debug
          } else {
            log::LevelFilter::Info
          })
          .build(),
      )?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      codex::codex_detect,
      codex::codex_login_status,
      codex::codex_login,
      codex::codex_logout,
      codex::codex_exec,
      codex_usage::codex_usage,
      codex_usage::codex_usage_inspect,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
