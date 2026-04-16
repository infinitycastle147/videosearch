use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct ApiServer(Mutex<Option<Child>>);

fn spawn_api_server_dev() -> Option<Child> {
    // Dev mode: find api.py by searching up from CWD
    let mut project_dir = std::env::current_dir().unwrap();
    for _ in 0..5 {
        if project_dir.join("api.py").exists() {
            break;
        }
        if let Some(parent) = project_dir.parent() {
            project_dir = parent.to_path_buf();
        } else {
            break;
        }
    }

    let venv_python = if cfg!(target_os = "windows") {
        project_dir.join("venv").join("Scripts").join("python.exe")
    } else {
        project_dir.join("venv").join("bin").join("python")
    };
    let api_script = project_dir.join("api.py");

    if !api_script.exists() {
        log::warn!("api.py not found at {:?}, skipping API server", api_script);
        return None;
    }

    match Command::new(&venv_python)
        .arg(&api_script)
        .current_dir(&project_dir)
        .spawn()
    {
        Ok(child) => {
            log::info!("API server started in dev mode (PID: {})", child.id());
            Some(child)
        }
        Err(e) => {
            log::error!("Failed to start API server: {}", e);
            None
        }
    }
}

fn spawn_api_server_prod(app: &tauri::App) -> Option<Child> {
    // Production: the sidecar folder is in Resources/binaries/videosearch-api/
    // Tauri also copies the main executable to MacOS/videosearch-api
    // We need to run from the Resources folder so it can find its dylibs
    let resource_dir = app.path().resource_dir().ok()?;
    let sidecar_dir = resource_dir.join("binaries").join("videosearch-api");
    let sidecar_name = if cfg!(target_os = "windows") {
        "videosearch-api.exe"
    } else {
        "videosearch-api"
    };
    let sidecar_path = sidecar_dir.join(sidecar_name);

    if !sidecar_path.exists() {
        log::warn!("Sidecar binary not found at {:?}", sidecar_path);
        return None;
    }

    match Command::new(&sidecar_path)
        .current_dir(&sidecar_dir)
        .spawn()
    {
        Ok(child) => {
            log::info!("API server started from sidecar (PID: {})", child.id());
            Some(child)
        }
        Err(e) => {
            log::error!("Failed to start sidecar API server: {}", e);
            None
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let child = if cfg!(debug_assertions) {
                spawn_api_server_dev()
            } else {
                spawn_api_server_prod(app).or_else(|| {
                    log::warn!("Sidecar not found, falling back to dev mode");
                    spawn_api_server_dev()
                })
            };

            app.manage(ApiServer(Mutex::new(child)));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                if let Some(server) = app.try_state::<ApiServer>() {
                    if let Ok(mut guard) = server.0.lock() {
                        if let Some(ref mut child) = *guard {
                            let _ = child.kill();
                            log::info!("API server stopped");
                        }
                    }
                }
            }
        });
}
