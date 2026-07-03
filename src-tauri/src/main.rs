#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use std::process::Child;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, RunEvent, WindowEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

mod process_lifecycle;
use process_lifecycle::{kill_process_tree, ProcessSupervisor};

static TERMINAL_SESSIONS: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();

fn terminal_sessions() -> &'static Mutex<HashMap<String, Arc<AtomicBool>>> {
    TERMINAL_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn make_session_id() -> String {
    format!(
        "{:x}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis())
            .unwrap_or(0)
    )
}

fn register_terminal_session(session_id: &str) -> Arc<AtomicBool> {
    let finished = Arc::new(AtomicBool::new(false));
    terminal_sessions()
        .lock()
        .unwrap()
        .insert(session_id.to_string(), Arc::clone(&finished));
    finished
}

#[tauri::command]
fn terminal_download_session_finished(session_id: String) -> Result<bool, String> {
    let sessions = terminal_sessions().lock().unwrap();
    let Some(flag) = sessions.get(&session_id) else {
        return Ok(true);
    };
    Ok(flag.load(Ordering::SeqCst))
}

#[tauri::command]
fn spawn_ollama_pull_terminal(
    models: Vec<String>,
    binary_path: Option<String>,
) -> Result<String, String> {
    if models.is_empty() {
        return Ok(String::new());
    }

    for model in &models {
        validate_model_name(model)?;
    }

    let session_id = make_session_id();
    let ollama = discover_ollama_binary(binary_path)?;
    let script_body = build_pull_script_body(&ollama, &models, &session_id)?;
    spawn_terminal_script_tracked(&script_body, &session_id)
}

#[tauri::command]
fn spawn_ollama_install_terminal() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return spawn_windows_ollama_install_powershell();
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        let script_body = concat!(
            "echo \"Nxtrive - Installing Ollama...\"\n",
            "curl -fsSL https://ollama.com/install.sh | sh"
        );
        return spawn_terminal_script_untracked(script_body, "Nxtrive — Installing Ollama");
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Automatic terminal install is not supported on this platform.".to_string())
    }
}

#[cfg(target_os = "windows")]
fn spawn_windows_ollama_install_powershell() -> Result<(), String> {
    use std::os::windows::process::CommandExt;

    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

    let script_path = write_windows_ollama_install_script()?;
    let script_arg = script_path.to_string_lossy().into_owned();

    std::process::Command::new("powershell")
        .args([
            "-NoExit",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_arg,
        ])
        .creation_flags(CREATE_NEW_CONSOLE)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open PowerShell: {error}"))
}

#[cfg(target_os = "windows")]
fn write_windows_ollama_install_script() -> Result<PathBuf, String> {
    let script_body = r#"
$ErrorActionPreference = 'Continue'
Write-Host 'Nxtrive - Installing Ollama...' -ForegroundColor Cyan
Write-Host ''

$startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
if (-not (Test-Path -LiteralPath $startup)) {
    Write-Host 'Creating missing Windows Startup folder (common fix for installer errors)...' -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $startup -Force | Out-Null
}

$installError = $null
try {
    $installScript = irm https://ollama.com/install.ps1 -UseBasicParsing
    Invoke-Expression $installScript
} catch {
    $installError = $_.Exception.Message
    Write-Host ''
    Write-Host $installError -ForegroundColor Red
}

if ($installError) {
    if ($installError -match 'exit code 8') {
        Write-Host ''
        Write-Host 'Installer exit code 8 means the Ollama setup could not finish preparing.' -ForegroundColor Yellow
        Write-Host 'Common fixes:' -ForegroundColor Yellow
        Write-Host '  1. Restart Windows, then run Install in Terminal again.' -ForegroundColor Yellow
        Write-Host '  2. Install manually from https://ollama.com/download/windows' -ForegroundColor Yellow
        Write-Host '  3. If you deleted Ollama before, reboot once then retry.' -ForegroundColor Yellow
    }

    Write-Host ''
    Write-Host 'Trying winget fallback...' -ForegroundColor Cyan
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        winget install --id Ollama.Ollama -e --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Host 'Winget install did not complete. Opening download page...' -ForegroundColor Yellow
            Start-Process 'https://ollama.com/download/windows'
        }
    } else {
        Write-Host 'winget not found. Opening download page...' -ForegroundColor Yellow
        Start-Process 'https://ollama.com/download/windows'
    }
}

Write-Host ''
Write-Host '========================================' -ForegroundColor Green
Write-Host ' Finished. Return to Nxtrive.' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Press Enter to close, or auto-closing in 12 seconds...' -ForegroundColor Gray
$deadline = [datetime]::UtcNow.AddSeconds(12)
while ([datetime]::UtcNow -lt $deadline) {
    if ([Console]::KeyAvailable) {
        [void][Console]::ReadKey($true)
        break
    }
    Start-Sleep -Milliseconds 150
}
exit
"#;

    let path = std::env::temp_dir().join(format!("nxtrive-install-{}.ps1", std::process::id()));
    std::fs::write(&path, script_body)
        .map_err(|error| format!("Failed to write install script: {error}"))?;
    Ok(path)
}

fn validate_model_name(model: &str) -> Result<(), String> {
    if model.is_empty() || model.len() > 128 {
        return Err("Invalid model name.".to_string());
    }

    let valid = model
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | ':' | '.' | '/'));
    if !valid {
        return Err(format!("Invalid model name: {model}"));
    }

    Ok(())
}

fn discover_ollama_binary(preferred: Option<String>) -> Result<String, String> {
    if let Some(path) = preferred.filter(|value| !value.trim().is_empty()) {
        let candidate = PathBuf::from(&path);
        if candidate.is_file() {
            return Ok(path);
        }
    }

    for candidate in ollama_candidate_paths() {
        if candidate.is_file() {
            return Ok(candidate.to_string_lossy().into_owned());
        }
    }

    if let Some(path) = find_ollama_in_path() {
        return Ok(path);
    }

    Err(
        "Could not find Ollama. Install it from https://ollama.com/download and try again."
            .to_string(),
    )
}

fn ollama_candidate_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            candidates.push(
                PathBuf::from(userprofile)
                    .join("AppData")
                    .join("Local")
                    .join("Programs")
                    .join("Ollama")
                    .join("ollama.exe"),
            );
        }
        candidates.push(PathBuf::from(r"C:\Program Files\Ollama\ollama.exe"));
        for letter in b'C'..=b'Z' {
            let drive = format!("{}:\\Program Files\\Ollama\\ollama.exe", letter as char);
            candidates.push(PathBuf::from(drive));
        }
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from("/usr/local/bin/ollama"));
        candidates.push(PathBuf::from("/opt/homebrew/bin/ollama"));
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push(PathBuf::from("/usr/local/bin/ollama"));
        candidates.push(PathBuf::from("/usr/bin/ollama"));
    }

    candidates
}

fn find_ollama_in_path() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("where")
            .arg("ollama")
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }

        for line in String::from_utf8_lossy(&output.stdout).lines() {
            let path = line.trim();
            if !path.is_empty() && PathBuf::from(path).is_file() {
                return Some(path.to_string());
            }
        }
        return None;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = std::process::Command::new("which")
            .arg("ollama")
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }

        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() || !PathBuf::from(&path).is_file() {
            return None;
        }
        Some(path)
    }
}

#[cfg(not(target_os = "windows"))]
fn quote_shell_path(path: &str) -> String {
    format!("'{}'", path.replace('\'', "'\\''"))
}

fn build_pull_script_body(
    ollama_path: &str,
    models: &[String],
    session_id: &str,
) -> Result<String, String> {
    if models.is_empty() {
        return Ok(String::new());
    }

    #[cfg(target_os = "windows")]
    {
        let lock_name = format!("nxtrive-dl-{session_id}.lock");
        let mut lines = vec![
            "setlocal EnableExtensions".to_string(),
            format!("set \"SESSION_LOCK=%TEMP%\\{lock_name}\""),
            "echo running>\"%SESSION_LOCK%\"".to_string(),
            "echo.".to_string(),
            "echo Nxtrive - downloading required Ollama models...".to_string(),
            "echo.".to_string(),
            format!("set \"OLLAMA_EXE={}\"", ollama_path.replace('"', "")),
            "if not exist \"%OLLAMA_EXE%\" (".to_string(),
            "  echo Ollama not found at %OLLAMA_EXE%".to_string(),
            "  del \"%SESSION_LOCK%\" 2>nul".to_string(),
            "  pause".to_string(),
            "  exit /b 1".to_string(),
            ")".to_string(),
            "set NO_COLOR=1".to_string(),
            "set OLLAMA_HOST=127.0.0.1:11434".to_string(),
            "echo Checking Ollama service...".to_string(),
            "\"%OLLAMA_EXE%\" list >nul 2>&1".to_string(),
            "if errorlevel 1 (".to_string(),
            "  echo Starting Ollama service...".to_string(),
            "  start \"\" /MIN \"%OLLAMA_EXE%\" serve".to_string(),
            "  timeout /t 4 /nobreak >nul".to_string(),
            ")".to_string(),
        ];

        for model in models {
            lines.push(format!("echo."));
            lines.push(format!("echo Running: \"%OLLAMA_EXE%\" pull {model}"));
            lines.push(format!("\"%OLLAMA_EXE%\" pull {model}"));
            lines.push("if errorlevel 1 goto :error".to_string());
        }

        lines.extend([
            "echo.".to_string(),
            "echo ========================================".to_string(),
            "echo  All required models downloaded.".to_string(),
            "echo  Return to Nxtrive - setup continues automatically.".to_string(),
            "echo ========================================".to_string(),
            "goto :done".to_string(),
            ":error".to_string(),
            "echo.".to_string(),
            "echo ========================================".to_string(),
            "echo  Download did not finish.".to_string(),
            "echo  Return to Nxtrive and click Run again in Terminal.".to_string(),
            "echo ========================================".to_string(),
            ":done".to_string(),
            "del \"%SESSION_LOCK%\" 2>nul".to_string(),
            "echo.".to_string(),
            "echo Press Enter to close, or auto-closing in 12 seconds...".to_string(),
            "choice /C Y /N /T 12 /D Y >nul 2>&1".to_string(),
            "exit /b 0".to_string(),
            "endlocal".to_string(),
        ]);

        return Ok(lines.join("\r\n"));
    }

    #[cfg(not(target_os = "windows"))]
    {
        let lock_dir = std::env::temp_dir();
        let lock_path = lock_dir.join(format!("nxtrive-dl-{session_id}.lock"));
        let lock_path = lock_path.to_string_lossy().replace('\\', "/");
        let ollama = quote_shell_path(ollama_path);
        let pulls = models
            .iter()
            .map(|model| format!("echo \"Downloading {model}...\"\n{ollama} pull {model}"))
            .collect::<Vec<_>>()
            .join("\n");

        Ok(format!(
            "SESSION_LOCK=\"{lock_path}\"\necho running > \"$SESSION_LOCK\"\ntrap 'rm -f \"$SESSION_LOCK\"' EXIT\n{pulls}\necho \"\"\necho \"========================================\"\necho \" All required models downloaded.\"\necho \" Return to Nxtrive - setup continues automatically.\"\necho \"========================================\""
        ))
    }
}

fn spawn_terminal_script_untracked(script_body: &str, _window_title: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let script_path = write_windows_batch_script(script_body)?;
        let script_arg = script_path.to_string_lossy().into_owned();
        spawn_windows_cmd_k(&script_arg).map(|_| ())
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        let script_path = write_unix_terminal_script(script_body)?;
        spawn_unix_terminal(&script_path)
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = script_body;
        Err("Automatic terminal commands are not supported on this platform.".to_string())
    }
}

fn spawn_terminal_script_tracked(script_body: &str, session_id: &str) -> Result<String, String> {
    let finished = register_terminal_session(session_id);

    #[cfg(target_os = "windows")]
    {
        let script_path = write_windows_batch_script(script_body)?;
        let script_arg = script_path.to_string_lossy().into_owned();
        let child = spawn_windows_cmd_k(&script_arg)?;
        thread::spawn(move || {
            let mut child = child;
            let _ = child.wait();
            finished.store(true, Ordering::SeqCst);
        });
        return Ok(session_id.to_string());
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        let script_path = write_unix_terminal_script(script_body)?;
        spawn_unix_terminal(&script_path)?;
        let lock_path = std::env::temp_dir().join(format!("nxtrive-dl-{session_id}.lock"));
        thread::spawn(move || {
            let started = Instant::now();
            while lock_path.exists() && started.elapsed() < Duration::from_secs(45 * 60) {
                thread::sleep(Duration::from_millis(500));
            }
            finished.store(true, Ordering::SeqCst);
        });
        return Ok(session_id.to_string());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        let _ = script_body;
        Err("Automatic terminal commands are not supported on this platform.".to_string())
    }
}

#[allow(dead_code)]
fn spawn_terminal_script(script_body: &str, _window_title: &str) -> Result<(), String> {
    spawn_terminal_script_untracked(script_body, _window_title)
}

#[cfg(target_os = "windows")]
fn spawn_windows_cmd_k(script_arg: &str) -> Result<Child, String> {
    use std::os::windows::process::CommandExt;

    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

    std::process::Command::new("cmd")
        .args(["/K", script_arg])
        .creation_flags(CREATE_NEW_CONSOLE)
        .spawn()
        .map_err(|error| format!("Failed to open Command Prompt: {error}"))
}

#[allow(dead_code)]
#[cfg(target_os = "windows")]
fn spawn_windows_terminal_via_powershell(script_arg: &str) -> Result<(), String> {
    let escaped = script_arg.replace('\'', "''");
    let command = format!(
        "Start-Process -FilePath $env:ComSpec -ArgumentList '/K','{escaped}' -WindowStyle Normal"
    );

    std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &command,
        ])
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Failed to open Command Prompt: {error}"))
}

#[cfg(target_os = "windows")]
fn write_windows_batch_script(script_body: &str) -> Result<PathBuf, String> {
    let path = std::env::temp_dir().join(format!("nxtrive-pull-{}.bat", std::process::id()));
    let content = format!("@echo off\r\ntitle Nxtrive Model Download\r\n{script_body}\r\n");
    std::fs::write(&path, &content)
        .map_err(|error| format!("Failed to write terminal script: {error}"))?;
    Ok(path)
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
const UNIX_TERMINAL_CLOSE_FOOTER: &str = r#"
echo ""
echo "========================================"
echo " Finished. Return to Nxtrive."
echo "========================================"
echo ""
echo "Press Enter to close (auto-closing in 12 seconds)..."
read -r -t 12 || true
"#;

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn write_unix_terminal_script(script_body: &str) -> Result<PathBuf, String> {
    #[cfg(target_os = "macos")]
    let path = std::env::temp_dir().join(format!("nxtrive-{}.command", std::process::id()));
    #[cfg(target_os = "linux")]
    let path = std::env::temp_dir().join(format!("nxtrive-{}.sh", std::process::id()));

    let content = format!(
        "#!/usr/bin/env bash\nset -euo pipefail\n{script_body}\n{footer}",
        footer = UNIX_TERMINAL_CLOSE_FOOTER
    );
    std::fs::write(&path, content).map_err(|error| format!("Failed to write terminal script: {error}"))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut permissions = std::fs::metadata(&path)
            .map_err(|error| format!("Failed to read script permissions: {error}"))?
            .permissions();
        permissions.set_mode(0o755);
        std::fs::set_permissions(&path, permissions)
            .map_err(|error| format!("Failed to mark script executable: {error}"))?;
    }

    Ok(path)
}

#[cfg(any(target_os = "macos", target_os = "linux"))]
fn spawn_unix_terminal(script_path: &PathBuf) -> Result<(), String> {
    let script = script_path
        .to_str()
        .ok_or_else(|| "Terminal script path is not valid UTF-8".to_string())?;

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(script)
            .spawn()
            .map_err(|error| format!("Failed to open Terminal: {error}"))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let runners: [(&str, Vec<String>); 6] = [
            (
                "gnome-terminal",
                vec!["--".into(), "bash".into(), script.into()],
            ),
            (
                "konsole",
                vec!["-e".into(), "bash".into(), script.into()],
            ),
            (
                "xfce4-terminal",
                vec!["-e".into(), format!("bash {script}")],
            ),
            (
                "alacritty",
                vec!["-e".into(), "bash".into(), script.into()],
            ),
            (
                "kitty",
                vec!["bash".into(), script.into()],
            ),
            (
                "xterm",
                vec!["-e".into(), "bash".into(), script.into()],
            ),
        ];

        for (binary, args) in runners {
            if std::process::Command::new(binary)
                .args(&args)
                .spawn()
                .is_ok()
            {
                return Ok(());
            }
        }

        return Err(
            "Failed to open a terminal. Install gnome-terminal, konsole, or xterm.".to_string(),
        );
    }
}

#[derive(Clone)]
struct BackendHandle {
    app: AppHandle,
    data_dir: String,
    child: Arc<Mutex<Option<CommandChild>>>,
    backend_pid: Arc<Mutex<Option<u32>>>,
    shutting_down: Arc<AtomicBool>,
    spawned_at: Arc<Mutex<Option<Instant>>>,
    process_supervisor: ProcessSupervisor,
}

impl BackendHandle {
    fn new(app: AppHandle, data_dir: String, process_supervisor: ProcessSupervisor) -> Self {
        Self {
            app,
            data_dir,
            child: Arc::new(Mutex::new(None)),
            backend_pid: Arc::new(Mutex::new(None)),
            shutting_down: Arc::new(AtomicBool::new(false)),
            spawned_at: Arc::new(Mutex::new(None)),
            process_supervisor,
        }
    }

    fn spawn(&self) -> Result<(), String> {
        if self.shutting_down.load(Ordering::SeqCst) {
            return Ok(());
        }

        if let Ok(guard) = self.child.lock() {
            if guard.is_some() {
                return Ok(());
            }
        }

        let spawn_result = if cfg!(debug_assertions) {
            self.spawn_dev_python()
        } else {
            self.spawn_release_sidecar()
        };

        let (mut rx, child) = spawn_result?;
        let pid = child.pid();

        if let Ok(mut guard) = self.child.lock() {
            *guard = Some(child);
        }
        if let Ok(mut guard) = self.backend_pid.lock() {
            *guard = Some(pid);
        }
        if let Ok(mut guard) = self.spawned_at.lock() {
            *guard = Some(Instant::now());
        }
        self.process_supervisor.assign_child(pid);

        let handle = self.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        eprintln!("Nxtrive backend: {}", String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Stderr(line) => {
                        eprintln!("Nxtrive backend error: {}", String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Terminated(payload) => {
                        eprintln!("Nxtrive backend terminated: {:?}", payload.code);
                        if let Ok(mut guard) = handle.child.lock() {
                            *guard = None;
                        }
                        if let Ok(mut guard) = handle.backend_pid.lock() {
                            *guard = None;
                        }
                        break;
                    }
                    _ => {}
                }
            }

            if handle.shutting_down.load(Ordering::SeqCst) {
                return;
            }

            let within_grace_period = handle
                .spawned_at
                .lock()
                .ok()
                .and_then(|guard| *guard)
                .is_some_and(|started| started.elapsed() < Duration::from_secs(45));

            if within_grace_period {
                return;
            }

            thread::sleep(Duration::from_secs(2));
            if handle.shutting_down.load(Ordering::SeqCst) {
                return;
            }
            if let Err(error) = handle.spawn() {
                eprintln!("Failed to restart backend: {error}");
            }
        });

        Ok(())
    }

    fn spawn_dev_python(&self) -> Result<(tauri::async_runtime::Receiver<CommandEvent>, CommandChild), String> {
        let backend_dir = dev_backend_dir();
        if !backend_dir.exists() {
            return Err(format!("Backend directory not found: {}", backend_dir.display()));
        }

        let mut command = self.app.shell().command("python");
        command = command.args(["main.py"]).current_dir(&backend_dir).env("NXTRIVE_DATA_DIR", &self.data_dir);

        if let Some(venv_bin) = dev_venv_bin_dir(&backend_dir) {
            let path = std::env::var("PATH").unwrap_or_default();
            let separator = if cfg!(windows) { ";" } else { ":" };
            command = command.env("PATH", format!("{}{separator}{}", venv_bin.display(), path));
        }

        command
            .spawn()
            .map_err(|error| format!("Failed to spawn Python backend: {error}"))
    }

    fn spawn_release_sidecar(&self) -> Result<(tauri::async_runtime::Receiver<CommandEvent>, CommandChild), String> {
        let resource_dir = self
            .app
            .path()
            .resource_dir()
            .map_err(|error| format!("Failed to resolve resource directory: {error}"))?;

        self.app
            .shell()
            .sidecar("nxtrive-backend")
            .map_err(|error| format!("Failed to resolve sidecar binary: {error}"))?
            .env("NXTRIVE_DATA_DIR", &self.data_dir)
            .current_dir(resource_dir)
            .spawn()
            .map_err(|error| format!("Failed to spawn backend sidecar: {error}"))
    }

    fn shutdown(&self) {
        if self.shutting_down.swap(true, Ordering::SeqCst) {
            return;
        }

        let pid = self
            .backend_pid
            .lock()
            .ok()
            .and_then(|guard| *guard);

        if let Ok(mut guard) = self.child.lock() {
            if let Some(child) = guard.take() {
                let child_pid = child.pid();
                let _ = child.kill();
                // Never block window close on taskkill — run cleanup in the background.
                thread::spawn(move || kill_process_tree(child_pid));
            }
        } else if let Some(child_pid) = pid {
            thread::spawn(move || kill_process_tree(child_pid));
        }

        if let Ok(mut guard) = self.backend_pid.lock() {
            *guard = None;
        }

        let port_file = PathBuf::from(&self.data_dir).join("backend.port");
        let _ = std::fs::remove_file(port_file);
    }

    fn restart(&self) -> Result<(), String> {
        if self.shutting_down.load(Ordering::SeqCst) {
            return Ok(());
        }
        self.shutting_down.store(false, Ordering::SeqCst);
        if let Ok(mut guard) = self.child.lock() {
            if let Some(child) = guard.take() {
                let child_pid = child.pid();
                let _ = child.kill();
                kill_process_tree(child_pid);
            }
        }
        if let Ok(mut guard) = self.backend_pid.lock() {
            *guard = None;
        }

        let port_file = PathBuf::from(&self.data_dir).join("backend.port");
        let _ = std::fs::remove_file(port_file);

        thread::sleep(Duration::from_millis(800));
        self.spawn()
    }
}

fn spawn_backend_with_retry(backend: &BackendHandle) {
    for attempt in 0..3 {
        match backend.spawn() {
            Ok(()) => return,
            Err(error) => {
                eprintln!("Backend spawn attempt {} failed: {error}", attempt + 1);
                thread::sleep(Duration::from_millis(250));
            }
        }
    }
}

fn dev_backend_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("project root")
        .join("backend")
}

fn dev_venv_bin_dir(backend_dir: &PathBuf) -> Option<PathBuf> {
    let windows = backend_dir.join(".venv/Scripts");
    if windows.exists() {
        return Some(windows);
    }

    let unix = backend_dir.join(".venv/bin");
    if unix.exists() {
        return Some(unix);
    }

    None
}

#[tauri::command]
fn restart_backend(backend: tauri::State<BackendHandle>) -> Result<(), String> {
    backend.restart()
}

#[tauri::command]
fn peek_backend_port(app: tauri::AppHandle) -> Result<Option<u16>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let port_file = data_dir.join("backend.port");

    match std::fs::read_to_string(&port_file) {
        Ok(content) => match content.trim().parse::<u16>() {
            Ok(port) if port > 0 => Ok(Some(port)),
            _ => Ok(None),
        },
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn get_backend_url(app: tauri::AppHandle, timeout_ms: Option<u64>) -> Result<String, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let port_file = data_dir.join("backend.port");
    let max_wait_ms = timeout_ms.unwrap_or(180_000);
    let step_ms = 100u64;
    let attempts = (max_wait_ms / step_ms).max(1);

    for _ in 0..attempts {
        if let Ok(content) = std::fs::read_to_string(&port_file) {
            if let Ok(port) = content.trim().parse::<u16>() {
                if port > 0 {
                    return Ok(format!("http://127.0.0.1:{port}"));
                }
            }
        }
        thread::sleep(Duration::from_millis(step_ms));
    }

    Err("Backend port is not available yet.".to_string())
}

#[tauri::command]
fn ensure_backend_started(backend: tauri::State<BackendHandle>) -> Result<(), String> {
    backend.spawn()
}

#[tauri::command]
fn shutdown_app(backend: tauri::State<BackendHandle>) {
    backend.shutdown();
}

fn shutdown_managed_processes(app_handle: &AppHandle) {
    if let Some(backend) = app_handle.try_state::<BackendHandle>() {
        backend.shutdown();
    }
}

fn request_app_exit(app_handle: &AppHandle) {
    shutdown_managed_processes(app_handle);
    app_handle.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            spawn_ollama_pull_terminal,
            terminal_download_session_finished,
            spawn_ollama_install_terminal,
            restart_backend,
            peek_backend_port,
            get_backend_url,
            ensure_backend_started,
            shutdown_app
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                request_app_exit(window.app_handle());
            }
        })
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .to_string();

            std::fs::create_dir_all(&data_dir).map_err(|error| error.to_string())?;

            let process_supervisor = ProcessSupervisor::new();
            app.manage(process_supervisor.clone());

            let backend = BackendHandle::new(app.handle().clone(), data_dir, process_supervisor);
            let boot_backend = backend.clone();
            thread::spawn(move || spawn_backend_with_retry(&boot_backend));

            app.manage(backend);
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::ExitRequested { .. } | RunEvent::Exit => {
                    shutdown_managed_processes(app_handle);
                }
                _ => {}
            }
        });
}
