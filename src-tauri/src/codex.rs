use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::ffi::OsString;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

const LOGIN_LOG_EVENT: &str = "codex://login-log";
const EXEC_PROGRESS_EVENT: &str = "codex://exec-progress";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexDetectResult {
  pub path: String,
  pub found: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexLoginStatusResult {
  pub logged_in: bool,
  pub detail: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexSimpleResult {
  pub ok: bool,
  pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexExecRequest {
  pub prompt: String,
  pub model: Option<String>,
  pub codex_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexExecResult {
  pub ok: bool,
  pub output: String,
  pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexPathRequest {
  pub codex_path: Option<String>,
}

fn home_dir() -> Option<PathBuf> {
  std::env::var_os("HOME").map(PathBuf::from)
}

fn candidate_paths() -> Vec<PathBuf> {
  let mut paths = vec![
    PathBuf::from("/opt/homebrew/bin/codex"),
    PathBuf::from("/usr/local/bin/codex"),
  ];

  if let Some(home) = home_dir() {
    paths.push(home.join(".codex/bin/codex"));
    paths.push(home.join(".npm-global/bin/codex"));
    paths.push(home.join(".local/bin/codex"));
  }

  paths
}

fn shell_value(command: &str) -> Option<String> {
  let output = Command::new("/bin/sh")
    .arg("-lc")
    .arg(command)
    .output()
    .ok()?;
  if !output.status.success() {
    return None;
  }
  let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
  if value.is_empty() {
    None
  } else {
    Some(value)
  }
}

fn apply_process_env(command: &mut Command) {
  for (key, value) in std::env::vars_os() {
    command.env(key, value);
  }

  if let Some(home) = home_dir() {
    command.env("HOME", &home);
    command.env("CODEX_HOME", home.join(".codex"));
    command.env("USER", shell_value("whoami").unwrap_or_else(|| "user".to_string()));
  }

  if let Some(path) = shell_value("printf '%s' \"$PATH\"") {
    command.env("PATH", path);
  }
}

fn prepare_command(codex: &PathBuf) -> Command {
  let mut command = Command::new(codex);
  apply_process_env(&mut command);
  command
}

fn resolve_codex_path(custom: Option<&str>) -> Result<PathBuf, String> {
  if let Some(path) = custom.map(str::trim).filter(|value| !value.is_empty()) {
    let resolved = PathBuf::from(path);
    if resolved.is_file() {
      return Ok(resolved);
    }
    return Err(format!("未找到 Codex 可执行文件：{path}"));
  }

  for candidate in candidate_paths() {
    if candidate.is_file() {
      return Ok(candidate);
    }
  }

  if let Ok(output) = Command::new("/bin/sh")
    .arg("-lc")
    .arg("command -v codex")
    .output()
  {
    if output.status.success() {
      let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
      if !stdout.is_empty() {
        let resolved = PathBuf::from(stdout);
        if resolved.is_file() {
          return Ok(resolved);
        }
      }
    }
  }

  Err("未检测到 Codex CLI，请在设置中指定路径或先安装 codex。".to_string())
}

fn run_command(codex: &PathBuf, args: &[&str]) -> Result<(i32, String, String), String> {
  let output = prepare_command(codex)
    .args(args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .output()
    .map_err(|error| format!("无法启动 Codex：{error}"))?;

  let code = output.status.code().unwrap_or(-1);
  let stdout = String::from_utf8_lossy(&output.stdout).to_string();
  let stderr = String::from_utf8_lossy(&output.stderr).to_string();
  Ok((code, stdout, stderr))
}

fn spawn_streaming(
  app: &AppHandle,
  codex: &PathBuf,
  args: &[&str],
  event_name: &str,
) -> Result<(i32, String), String> {
  let mut child = prepare_command(codex)
    .args(args)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|error| format!("无法启动 Codex：{error}"))?;

  let stdout = child.stdout.take();
  let stderr = child.stderr.take();
  let app_handle = app.clone();
  let event = event_name.to_string();

  let stdout_thread = stdout.map(|pipe| {
    let app_handle = app_handle.clone();
    let event = event.clone();
    thread::spawn(move || {
      let reader = BufReader::new(pipe);
      for line in reader.lines().map_while(Result::ok) {
        let _ = app_handle.emit(&event, line);
      }
    })
  });

  let stderr_thread = stderr.map(|pipe| {
    let app_handle = app_handle.clone();
    let event = event.clone();
    thread::spawn(move || {
      let reader = BufReader::new(pipe);
      for line in reader.lines().map_while(Result::ok) {
        let _ = app_handle.emit(&event, line);
      }
    })
  });

  if let Some(handle) = stdout_thread {
    let _ = handle.join();
  }
  if let Some(handle) = stderr_thread {
    let _ = handle.join();
  }

  let status = child
    .wait()
    .map_err(|error| format!("等待 Codex 进程失败：{error}"))?;
  let code = status.code().unwrap_or(-1);
  Ok((code, String::new()))
}

#[tauri::command]
pub fn codex_detect(request: Option<CodexPathRequest>) -> CodexDetectResult {
  let custom = request.and_then(|value| value.codex_path);
  match resolve_codex_path(custom.as_deref()) {
    Ok(path) => CodexDetectResult {
      path: path.to_string_lossy().to_string(),
      found: true,
    },
    Err(message) => CodexDetectResult {
      path: message,
      found: false,
    },
  }
}

#[tauri::command]
pub fn codex_login_status(request: Option<CodexPathRequest>) -> Result<CodexLoginStatusResult, String> {
  let custom = request.and_then(|value| value.codex_path);
  let codex = resolve_codex_path(custom.as_deref())?;
  let (code, stdout, stderr) = run_command(&codex, &["login", "status"])?;
  let detail = if stdout.trim().is_empty() {
    stderr.trim().to_string()
  } else {
    stdout.trim().to_string()
  };

  let logged_in = code == 0
    && (detail.to_ascii_lowercase().contains("logged in")
      || detail.contains("已登录")
      || detail.contains("登录"));

  Ok(CodexLoginStatusResult { logged_in, detail })
}

#[tauri::command]
pub async fn codex_login(
  app: AppHandle,
  request: Option<CodexPathRequest>,
) -> Result<CodexSimpleResult, String> {
  let custom = request.and_then(|value| value.codex_path);
  let codex = resolve_codex_path(custom.as_deref())?;
  let (code, _) = spawn_streaming(&app, &codex, &["login"], LOGIN_LOG_EVENT)?;

  if code == 0 {
    Ok(CodexSimpleResult {
      ok: true,
      message: "Codex 登录成功。".to_string(),
    })
  } else {
    Ok(CodexSimpleResult {
      ok: false,
      message: format!("Codex 登录未完成（退出码 {code}）。"),
    })
  }
}

#[tauri::command]
pub fn codex_logout(request: Option<CodexPathRequest>) -> Result<CodexSimpleResult, String> {
  let custom = request.and_then(|value| value.codex_path);
  let codex = resolve_codex_path(custom.as_deref())?;
  let (code, stdout, stderr) = run_command(&codex, &["logout"])?;
  let message = if stdout.trim().is_empty() {
    stderr.trim().to_string()
  } else {
    stdout.trim().to_string()
  };

  Ok(CodexSimpleResult {
    ok: code == 0,
    message: if message.is_empty() {
      if code == 0 {
        "已退出 Codex 登录。".to_string()
      } else {
        format!("退出登录失败（退出码 {code}）。")
      }
    } else {
      message
    },
  })
}

fn json_message(value: &Value) -> Option<String> {
  if let Some(message) = value.get("message").and_then(Value::as_str) {
    return Some(message.to_string());
  }
  if let Some(message) = value.pointer("/error/message").and_then(Value::as_str) {
    return Some(message.to_string());
  }
  None
}

fn extract_exec_error(lines: &[String], code: i32) -> String {
  for line in lines.iter().rev() {
    if let Ok(value) = serde_json::from_str::<Value>(line) {
      if let Some(message) = json_message(&value) {
        if message.to_ascii_lowercase().contains("log in again")
          || message.contains("登录")
          || message.contains("refresh token")
        {
          return "Codex 会话已过期，请在设置中重新登录后再试。".to_string();
        }
        return message;
      }
    }
  }

  for line in lines.iter().rev() {
    let trimmed = line.trim();
    if !trimmed.is_empty() {
      if trimmed.to_ascii_lowercase().contains("log in again") {
        return "Codex 会话已过期，请在设置中重新登录后再试。".to_string();
      }
      return trimmed.to_string();
    }
  }

  format!("Codex 执行失败（退出码 {code}）。请检查登录状态与模型配置。")
}

#[tauri::command]
pub async fn codex_exec(
  app: AppHandle,
  request: CodexExecRequest,
) -> Result<CodexExecResult, String> {
  let codex = resolve_codex_path(request.codex_path.as_deref())?;
  let temp_dir = std::env::temp_dir().join(format!(
    "read2md-codex-{}",
    std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .map(|value| value.as_millis())
      .unwrap_or(0)
  ));

  std::fs::create_dir_all(&temp_dir)
    .map_err(|error| format!("无法创建临时目录：{error}"))?;
  let output_file = temp_dir.join("output.txt");

  let mut args: Vec<OsString> = vec![OsString::from("exec")];
  if let Some(model) = request.model.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
    args.push(OsString::from("-m"));
    args.push(OsString::from(model));
  }
  for arg in [
    "--sandbox",
    "read-only",
    "--skip-git-repo-check",
    "--ephemeral",
    "-C",
    temp_dir.to_string_lossy().as_ref(),
    "-o",
    output_file.to_string_lossy().as_ref(),
    "--json",
    "-",
  ] {
    args.push(OsString::from(arg));
  }

  let mut child = prepare_command(&codex)
    .args(args)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|error| format!("无法启动 Codex exec：{error}"))?;

  if let Some(mut stdin) = child.stdin.take() {
    stdin
      .write_all(request.prompt.as_bytes())
      .map_err(|error| format!("写入 prompt 失败：{error}"))?;
    let _ = stdin.flush();
  }

  let stream_lines: Arc<Mutex<Vec<String>>> = Arc::new(Mutex::new(Vec::new()));
  let stdout_lines = stream_lines.clone();
  let stderr_lines = stream_lines.clone();
  let app_handle = app.clone();

  if let Some(pipe) = child.stdout.take() {
    thread::spawn(move || {
      let reader = BufReader::new(pipe);
      for line in reader.lines().map_while(Result::ok) {
        stdout_lines.lock().ok().map(|mut lines| lines.push(line.clone()));
        let _ = app_handle.emit(EXEC_PROGRESS_EVENT, line);
      }
    });
  }

  if let Some(pipe) = child.stderr.take() {
    thread::spawn(move || {
      let reader = BufReader::new(pipe);
      for line in reader.lines().map_while(Result::ok) {
        stderr_lines.lock().ok().map(|mut lines| lines.push(line.clone()));
      }
    });
  }

  let status = child
    .wait()
    .map_err(|error| format!("等待 Codex exec 失败：{error}"))?;
  let code = status.code().unwrap_or(-1);

  let output = std::fs::read_to_string(&output_file).unwrap_or_default();
  let log_lines = stream_lines
    .lock()
    .map(|lines| lines.clone())
    .unwrap_or_default();
  let _ = std::fs::remove_dir_all(&temp_dir);

  let trimmed = output.trim().to_string();
  if code != 0 {
    return Ok(CodexExecResult {
      ok: false,
      output: trimmed,
      error: Some(extract_exec_error(&log_lines, code)),
    });
  }

  if trimmed.is_empty() {
    return Ok(CodexExecResult {
      ok: false,
      output: String::new(),
      error: Some(extract_exec_error(&log_lines, code)),
    });
  }

  Ok(CodexExecResult {
    ok: true,
    output: trimmed,
    error: None,
  })
}
