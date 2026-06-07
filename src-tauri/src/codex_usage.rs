use log::{debug, info, warn};
use serde::{Deserialize, Deserializer, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const USAGE_ENDPOINT: &str = "https://chatgpt.com/backend-api/wham/usage";
const TOKEN_ENDPOINT: &str = "https://auth.openai.com/oauth/token";
const CLIENT_ID: &str = "app_EMoamEEZ73f0CkXaXp7hrann";
const USER_AGENT: &str = "Read2MD-Studio";

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexRateWindow {
  pub used_percent: f64,
  pub remaining_percent: f64,
  pub window_minutes: Option<i64>,
  pub resets_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexUsageResult {
  pub ok: bool,
  pub plan_type: Option<String>,
  pub account_email: Option<String>,
  pub session: Option<CodexRateWindow>,
  pub weekly: Option<CodexRateWindow>,
  pub credits_balance: Option<f64>,
  pub credits_unlimited: bool,
  pub message: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexUsageInspectResult {
  pub auth_path: String,
  pub codex_home: String,
  pub auth_file_exists: bool,
  pub top_level_keys: Vec<String>,
  pub auth_mode: Option<String>,
  pub has_openai_api_key: bool,
  pub token_fields: Vec<String>,
  pub has_access_token: bool,
  pub has_refresh_token: bool,
  pub has_id_token: bool,
  pub account_id_source: Option<String>,
  pub account_id_preview: Option<String>,
  pub account_email: Option<String>,
  pub jwt_claim_keys: Vec<String>,
  pub parse_error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AuthFile {
  auth_mode: Option<String>,
  tokens: Option<AuthTokens>,
  #[serde(rename = "OPENAI_API_KEY")]
  openai_api_key: Option<String>,
  last_refresh: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct AuthTokens {
  access_token: Option<String>,
  refresh_token: Option<String>,
  id_token: Option<String>,
  account_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UsageResponse {
  plan_type: Option<String>,
  email: Option<String>,
  rate_limit: Option<RateLimitDetails>,
  credits: Option<CreditDetails>,
}

#[derive(Debug, Deserialize)]
struct RateLimitDetails {
  primary_window: Option<WindowSnapshot>,
  secondary_window: Option<WindowSnapshot>,
}

#[derive(Debug, Deserialize)]
struct WindowSnapshot {
  used_percent: Option<f64>,
  reset_at: Option<i64>,
  limit_window_seconds: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct CreditDetails {
  has_credits: Option<bool>,
  unlimited: Option<bool>,
  #[serde(default, deserialize_with = "deserialize_optional_f64")]
  balance: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct TokenRefreshResponse {
  access_token: Option<String>,
  refresh_token: Option<String>,
  id_token: Option<String>,
}

fn deserialize_optional_f64<'de, D>(deserializer: D) -> Result<Option<f64>, D::Error>
where
  D: Deserializer<'de>,
{
  use serde::de::Error;
  let value = Option::<serde_json::Value>::deserialize(deserializer)?;
  let Some(value) = value else {
    return Ok(None);
  };

  match value {
    serde_json::Value::Number(number) => number
      .as_f64()
      .ok_or_else(|| Error::custom("invalid numeric balance"))
      .map(Some),
    serde_json::Value::String(text) => {
      let trimmed = text.trim();
      if trimmed.is_empty() {
        Ok(None)
      } else {
        trimmed
          .parse::<f64>()
          .map(Some)
          .map_err(|error| Error::custom(format!("invalid string balance: {error}")))
      }
    }
    serde_json::Value::Null => Ok(None),
    _ => Err(Error::custom("balance must be a number or string")),
  }
}

fn home_dir() -> Option<PathBuf> {
  std::env::var_os("HOME").map(PathBuf::from)
}

fn codex_home() -> PathBuf {
  if let Ok(path) = std::env::var("CODEX_HOME") {
    if !path.trim().is_empty() {
      return PathBuf::from(path);
    }
  }
  home_dir()
    .map(|home| home.join(".codex"))
    .unwrap_or_else(|| PathBuf::from(".codex"))
}

fn auth_file_path() -> PathBuf {
  codex_home().join("auth.json")
}

fn preview_secret(value: &str) -> String {
  let trimmed = value.trim();
  if trimmed.len() <= 12 {
    return "***".to_string();
  }
  format!("{}…{}", &trimmed[..8], &trimmed[trimmed.len() - 4..])
}

fn load_auth_raw() -> Result<(PathBuf, String), String> {
  let path = auth_file_path();
  if !path.is_file() {
    return Err(format!(
      "未找到 {}，请先在设置中登录 Codex。",
      path.display()
    ));
  }

  let raw = fs::read_to_string(&path).map_err(|error| format!("无法读取 auth.json：{error}"))?;
  Ok((path, raw))
}

fn load_auth_file() -> Result<AuthFile, String> {
  let (path, raw) = load_auth_raw()?;
  debug!("[codex_usage] loading auth from {}", path.display());
  serde_json::from_str(&raw).map_err(|error| format!("auth.json 格式无效：{error}"))
}

fn save_auth_tokens(tokens: &AuthTokens) -> Result<(), String> {
  let path = auth_file_path();
  let mut json: serde_json::Value = if path.is_file() {
    let raw = fs::read_to_string(&path).map_err(|error| format!("无法读取 auth.json：{error}"))?;
    serde_json::from_str(&raw).map_err(|error| format!("auth.json 格式无效：{error}"))?
  } else {
    serde_json::json!({})
  };

  json["tokens"] = serde_json::to_value(tokens).map_err(|error| error.to_string())?;
  json["last_refresh"] = serde_json::Value::String(
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map(|value| value.as_secs().to_string())
      .unwrap_or_else(|_| "0".to_string()),
  );

  let serialized =
    serde_json::to_string_pretty(&json).map_err(|error| format!("无法序列化 auth.json：{error}"))?;
  fs::write(&path, serialized).map_err(|error| format!("无法写入 auth.json：{error}"))
}

fn extract_credentials(auth: &AuthFile) -> Result<(String, Option<String>, String, &'static str), String> {
  if let Some(api_key) = auth
    .openai_api_key
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
  {
    info!("[codex_usage] credential mode: OPENAI_API_KEY ({})", preview_secret(api_key));
    return Ok((api_key.to_string(), None, String::new(), "OPENAI_API_KEY"));
  }

  let tokens = auth
    .tokens
    .as_ref()
    .ok_or_else(|| "auth.json 中缺少 tokens，请重新登录 Codex。".to_string())?;

  let access_token = tokens
    .access_token
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .ok_or_else(|| "auth.json 中缺少 access_token，请重新登录 Codex。".to_string())?;

  let refresh_token = tokens
    .refresh_token
    .as_deref()
    .map(str::trim)
    .filter(|value| !value.is_empty())
    .unwrap_or("")
    .to_string();

  info!(
    "[codex_usage] credential mode: oauth tokens (access={}, refresh={}, account_id={})",
    preview_secret(access_token),
    if refresh_token.is_empty() {
      "missing".to_string()
    } else {
      preview_secret(&refresh_token)
    },
    tokens
      .account_id
      .as_deref()
      .map(preview_secret)
      .unwrap_or_else(|| "missing".to_string())
  );

  Ok((
    access_token.to_string(),
    tokens.account_id.clone(),
    refresh_token,
    "oauth",
  ))
}

fn decode_jwt_payload(id_token: &str) -> Option<serde_json::Value> {
  let payload = id_token.split('.').nth(1)?;
  use base64::Engine;
  let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
    .decode(payload)
    .ok()?;
  serde_json::from_slice(&decoded).ok()
}

fn jwt_claim_keys(id_token: &str) -> Vec<String> {
  decode_jwt_payload(id_token)
    .and_then(|json| json.as_object().map(|object| object.keys().cloned().collect()))
    .unwrap_or_default()
}

fn decode_jwt_claim(id_token: &str, keys: &[&str]) -> Option<String> {
  let json = decode_jwt_payload(id_token)?;
  for key in keys {
    if let Some(value) = json.get(key).and_then(|entry| entry.as_str()) {
      if !value.trim().is_empty() {
        return Some(value.to_string());
      }
    }
  }

  if let Some(auth) = json.get("https://api.openai.com/auth") {
    if let Some(value) = auth
      .get("chatgpt_account_id")
      .and_then(|entry| entry.as_str())
    {
      if !value.trim().is_empty() {
        return Some(value.to_string());
      }
    }
  }

  json
    .get("organizations")
    .and_then(|entry| entry.as_array())
    .and_then(|items| items.first())
    .and_then(|item| item.get("id"))
    .and_then(|entry| entry.as_str())
    .filter(|value| !value.trim().is_empty())
    .map(str::to_string)
}

fn decode_jwt_email(id_token: &str) -> Option<String> {
  decode_jwt_claim(
    id_token,
    &["email", "https://api.openai.com/profile.email"],
  )
}

fn extract_account_id(auth: &AuthFile) -> (Option<String>, Option<String>) {
  if let Some(account_id) = auth
    .tokens
    .as_ref()
    .and_then(|tokens| tokens.account_id.clone())
    .filter(|value| !value.trim().is_empty())
  {
    return (Some(account_id), Some("tokens.account_id".to_string()));
  }

  if let Some(id_token) = auth.tokens.as_ref().and_then(|tokens| tokens.id_token.as_deref()) {
    if let Some(account_id) = decode_jwt_claim(
      id_token,
      &[
        "https://api.openai.com/auth.chatgpt_account_id",
        "chatgpt_account_id",
        "account_id",
      ],
    ) {
      return (Some(account_id), Some("jwt.id_token".to_string()));
    }

    if let Some(account_id) = auth
      .tokens
      .as_ref()
      .and_then(|tokens| tokens.access_token.as_deref())
      .and_then(|access_token| {
        decode_jwt_claim(
          access_token,
          &[
            "https://api.openai.com/auth.chatgpt_account_id",
            "chatgpt_account_id",
            "account_id",
          ],
        )
      })
    {
      return (Some(account_id), Some("jwt.access_token".to_string()));
    }
  }

  (None, None)
}

fn inspect_auth_file() -> CodexUsageInspectResult {
  let auth_path = auth_file_path();
  let codex_home = codex_home();
  let auth_file_exists = auth_path.is_file();

  let mut result = CodexUsageInspectResult {
    auth_path: auth_path.display().to_string(),
    codex_home: codex_home.display().to_string(),
    auth_file_exists,
    top_level_keys: Vec::new(),
    auth_mode: None,
    has_openai_api_key: false,
    token_fields: Vec::new(),
    has_access_token: false,
    has_refresh_token: false,
    has_id_token: false,
    account_id_source: None,
    account_id_preview: None,
    account_email: None,
    jwt_claim_keys: Vec::new(),
    parse_error: None,
  };

  if !auth_file_exists {
    result.parse_error = Some("auth.json not found".to_string());
    return result;
  }

  let raw = match fs::read_to_string(&auth_path) {
    Ok(value) => value,
    Err(error) => {
      result.parse_error = Some(format!("read failed: {error}"));
      return result;
    }
  };

  let json: serde_json::Value = match serde_json::from_str(&raw) {
    Ok(value) => value,
    Err(error) => {
      result.parse_error = Some(format!("json parse failed: {error}"));
      return result;
    }
  };

  if let Some(object) = json.as_object() {
    result.top_level_keys = object.keys().cloned().collect();
  }

  let auth: AuthFile = match serde_json::from_value(json.clone()) {
    Ok(value) => value,
    Err(error) => {
      result.parse_error = Some(format!("auth schema parse failed: {error}"));
      return result;
    }
  };

  result.auth_mode = auth.auth_mode.clone();
  result.has_openai_api_key = auth
    .openai_api_key
    .as_deref()
    .map(str::trim)
    .is_some_and(|value| !value.is_empty());

  if let Some(tokens) = auth.tokens.as_ref() {
    if tokens.access_token.is_some() {
      result.token_fields.push("access_token".to_string());
      result.has_access_token = tokens
        .access_token
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty());
    }
    if tokens.refresh_token.is_some() {
      result.token_fields.push("refresh_token".to_string());
      result.has_refresh_token = tokens
        .refresh_token
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty());
    }
    if tokens.id_token.is_some() {
      result.token_fields.push("id_token".to_string());
      result.has_id_token = tokens
        .id_token
        .as_deref()
        .is_some_and(|value| !value.trim().is_empty());
    }
    if tokens.account_id.is_some() {
      result.token_fields.push("account_id".to_string());
    }
  }

  let (account_id, account_id_source) = extract_account_id(&auth);
  result.account_id_source = account_id_source;
  result.account_id_preview = account_id.as_deref().map(preview_secret);

  if let Some(id_token) = auth.tokens.as_ref().and_then(|tokens| tokens.id_token.as_deref()) {
    result.jwt_claim_keys = jwt_claim_keys(id_token);
    result.account_email = decode_jwt_email(id_token);
  }

  info!(
    "[codex_usage] inspect auth_path={} auth_mode={:?} token_fields={:?} account_id_source={:?}",
    result.auth_path, result.auth_mode, result.token_fields, result.account_id_source
  );

  result
}

async fn refresh_access_token(
  refresh_token: &str,
  existing_account_id: Option<String>,
) -> Result<AuthTokens, String> {
  if refresh_token.trim().is_empty() {
    return Err("缺少 refresh_token，请重新登录 Codex。".to_string());
  }

  info!("[codex_usage] refreshing access token");
  let client = reqwest::Client::new();
  let response = client
    .post(TOKEN_ENDPOINT)
    .header("Content-Type", "application/json")
    .json(&serde_json::json!({
      "client_id": CLIENT_ID,
      "grant_type": "refresh_token",
      "refresh_token": refresh_token,
      "scope": "openid profile email",
    }))
    .send()
    .await
    .map_err(|error| format!("刷新 token 失败：{error}"))?;

  let status = response.status();
  if !status.is_success() {
    let body = response.text().await.unwrap_or_default();
    warn!(
      "[codex_usage] token refresh failed status={} body={}",
      status,
      body.chars().take(300).collect::<String>()
    );
    return Err(format!("Codex 会话已过期，请在设置中重新登录（HTTP {status}）。"));
  }

  let body: TokenRefreshResponse = response
    .json()
    .await
    .map_err(|error| format!("刷新 token 响应无效：{error}"))?;

  let access_token = body
    .access_token
    .filter(|value| !value.trim().is_empty())
    .ok_or_else(|| "刷新 token 响应缺少 access_token。".to_string())?;

  let account_id = existing_account_id.or_else(|| {
    body.id_token.as_deref().and_then(|id_token| {
      decode_jwt_claim(
        id_token,
        &[
          "https://api.openai.com/auth.chatgpt_account_id",
          "chatgpt_account_id",
          "account_id",
        ],
      )
    })
  });

  let tokens = AuthTokens {
    access_token: Some(access_token),
    refresh_token: body.refresh_token,
    id_token: body.id_token,
    account_id,
  };

  save_auth_tokens(&tokens)?;
  info!("[codex_usage] token refresh succeeded");
  Ok(tokens)
}

fn to_rate_window(snapshot: &WindowSnapshot) -> CodexRateWindow {
  let used_percent = snapshot.used_percent.unwrap_or(0.0);
  CodexRateWindow {
    used_percent,
    remaining_percent: (100.0 - used_percent).max(0.0),
    window_minutes: snapshot
      .limit_window_seconds
      .map(|seconds| seconds / 60),
    resets_at: snapshot.reset_at,
  }
}

async fn fetch_usage(access_token: &str, account_id: Option<&str>) -> Result<UsageResponse, String> {
  let client = reqwest::Client::new();
  let mut request = client
    .get(USAGE_ENDPOINT)
    .header("Authorization", format!("Bearer {access_token}"))
    .header("User-Agent", USER_AGENT)
    .header("Accept", "application/json");

  if let Some(account_id) = account_id.filter(|value| !value.trim().is_empty()) {
    debug!(
      "[codex_usage] fetch usage with ChatGPT-Account-Id={}",
      preview_secret(account_id)
    );
    request = request.header("ChatGPT-Account-Id", account_id);
  } else {
    warn!("[codex_usage] fetch usage without ChatGPT-Account-Id header");
  }

  let response = request
    .send()
    .await
    .map_err(|error| format!("获取 Codex 用量失败：{error}"))?;

  let status = response.status();
  if status.as_u16() == 401 {
    warn!("[codex_usage] usage request unauthorized");
    return Err("UNAUTHORIZED".to_string());
  }

  if !status.is_success() {
    let body = response.text().await.unwrap_or_default();
    warn!(
      "[codex_usage] usage request failed status={} body={}",
      status,
      body.chars().take(500).collect::<String>()
    );
    return Err(format!(
      "获取 Codex 用量失败（HTTP {}）{}",
      status,
      if body.is_empty() {
        String::new()
      } else {
        format!("：{}", body.chars().take(200).collect::<String>())
      }
    ));
  }

  let body = response
    .text()
    .await
    .map_err(|error| format!("读取 Codex 用量响应失败：{error}"))?;

  debug!(
    "[codex_usage] usage response preview={}",
    body.chars().take(400).collect::<String>()
  );

  serde_json::from_str::<UsageResponse>(&body).map_err(|error| {
    warn!(
      "[codex_usage] usage json parse failed: {error}; body={}",
      body.chars().take(500).collect::<String>()
    );
    format!("解析 Codex 用量失败：{error}")
  })
}

fn build_usage_result(usage: UsageResponse, account_email: Option<String>) -> CodexUsageResult {
  let session = usage
    .rate_limit
    .as_ref()
    .and_then(|rate| rate.primary_window.as_ref())
    .map(to_rate_window);
  let weekly = usage
    .rate_limit
    .as_ref()
    .and_then(|rate| rate.secondary_window.as_ref())
    .map(to_rate_window);

  let account_email = account_email.or(usage.email);

  info!(
    "[codex_usage] usage ok plan_type={:?} session={:?} weekly={:?} credits={:?}",
    usage.plan_type,
    session.as_ref().map(|window| window.used_percent),
    weekly.as_ref().map(|window| window.used_percent),
    usage.credits.as_ref().and_then(|credits| credits.balance)
  );

  CodexUsageResult {
    ok: true,
    plan_type: usage.plan_type,
    account_email,
    session,
    weekly,
    credits_balance: usage.credits.as_ref().and_then(|credits| credits.balance),
    credits_unlimited: usage
      .credits
      .as_ref()
      .and_then(|credits| credits.unlimited)
      .unwrap_or(false),
    message: "Codex 用量已更新。".to_string(),
  }
}

fn failure_usage_result(account_email: Option<String>, message: impl Into<String>) -> CodexUsageResult {
  let message = message.into();
  warn!("[codex_usage] failure: {message}");
  CodexUsageResult {
    ok: false,
    plan_type: None,
    account_email,
    session: None,
    weekly: None,
    credits_balance: None,
    credits_unlimited: false,
    message,
  }
}

#[tauri::command]
pub fn codex_usage_inspect() -> CodexUsageInspectResult {
  inspect_auth_file()
}

#[tauri::command]
pub async fn codex_usage() -> Result<CodexUsageResult, String> {
  let inspect = inspect_auth_file();
  if let Some(error) = inspect.parse_error.clone() {
    return Ok(failure_usage_result(inspect.account_email, error));
  }

  let auth = match load_auth_file() {
    Ok(value) => value,
    Err(error) => return Ok(failure_usage_result(None, error)),
  };

  let account_email = auth
    .tokens
    .as_ref()
    .and_then(|tokens| tokens.id_token.as_deref())
    .and_then(decode_jwt_email);
  let (account_id, account_id_source) = extract_account_id(&auth);
  debug!(
    "[codex_usage] account_id_source={:?} preview={:?}",
    account_id_source,
    account_id.as_deref().map(preview_secret)
  );

  let (mut access_token, _, refresh_token, credential_mode) = match extract_credentials(&auth) {
    Ok(value) => value,
    Err(error) => return Ok(failure_usage_result(account_email, error)),
  };

  if credential_mode == "OPENAI_API_KEY" {
    return Ok(failure_usage_result(
      account_email,
      "当前 auth.json 使用 API Key 模式，Codex 用量接口需要 ChatGPT OAuth 登录。",
    ));
  }

  let usage = match fetch_usage(&access_token, account_id.as_deref()).await {
    Ok(value) => value,
    Err(error) if error == "UNAUTHORIZED" && !refresh_token.is_empty() => {
      let refreshed = match refresh_access_token(&refresh_token, account_id.clone()).await {
        Ok(value) => value,
        Err(error) => return Ok(failure_usage_result(account_email, error)),
      };
      access_token = refreshed
        .access_token
        .clone()
        .unwrap_or_default();
      if access_token.trim().is_empty() {
        return Ok(failure_usage_result(
          account_email,
          "刷新 token 后仍缺少 access_token。",
        ));
      }
      let refreshed_account_id = refreshed.account_id.clone().or(account_id);
      match fetch_usage(&access_token, refreshed_account_id.as_deref()).await {
        Ok(value) => value,
        Err(error) if error == "UNAUTHORIZED" => {
          return Ok(failure_usage_result(
            account_email,
            "Codex 会话已过期，请在设置中重新登录。",
          ));
        }
        Err(error) => return Ok(failure_usage_result(account_email, error)),
      }
    }
    Err(error) if error == "UNAUTHORIZED" => {
      return Ok(failure_usage_result(
        account_email,
        "Codex 会话已过期，请在设置中重新登录。",
      ));
    }
    Err(error) => return Ok(failure_usage_result(account_email, error)),
  };

  Ok(build_usage_result(usage, account_email))
}
