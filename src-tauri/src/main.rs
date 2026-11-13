// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, PhysicalSize, Size};

// 切换迷你悬浮条 (560x48) 与 全屏办公室大看板 (980x620)
#[tauri::command]
fn toggle_full_view(app_handle: tauri::AppHandle, is_full: bool) {
    if let Some(window) = app_handle.get_webview_window("main") {
        if is_full {
            let _ = window.set_size(Size::Physical(PhysicalSize {
                width: 980,
                height: 620,
            }));
            let _ = window.center();
        } else {
            let _ = window.set_size(Size::Physical(PhysicalSize {
                width: 560,
                height: 48,
            }));
        }
    }
}

// 唤醒本地官方客户端
#[tauri::command]
fn launch_local_client(client: String) {
    #[cfg(target_os = "windows")]
    {
        let cmd = match client.as_str() {
            "openai" => "start chatgpt:",
            "claude" => "start claude:",
            _ => "",
        };
        if !cmd.is_empty() {
            let _ = std::process::Command::new("cmd").args(["/C", cmd]).spawn();
        }
    }

    #[cfg(target_os = "macos")]
    {
        let app_name = match client.as_str() {
            "openai" => "ChatGPT",
            "claude" => "Claude",
            "deepseek" => "DeepSeek",
            "antigravity" => "Antigravity",
            _ => "",
        };
        if !app_name.is_empty() {
            let _ = std::process::Command::new("open").args(["-a", app_name]).spawn();
        }
    }

    #[cfg(target_os = "linux")]
    {
        let desktop_file = match client.as_str() {
            "openai" => "chatgpt.desktop",
            "claude" => "com.anthropic.Claude.desktop",
            "deepseek" => "deepseek-harness.desktop",
            "antigravity" => "antigravity.desktop",
            _ => "",
        };
        if !desktop_file.is_empty() {
            let _ = std::process::Command::new("gtk-launch").arg(desktop_file).spawn();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![toggle_full_view, launch_local_client])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
