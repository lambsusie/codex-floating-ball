use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{path::PathBuf, process::Stdio, time::{Duration, SystemTime, UNIX_EPOCH}};
use tokio::{io::{AsyncBufReadExt, AsyncWriteExt, BufReader}, process::{Child, ChildStdin, ChildStdout, Command}, sync::Mutex};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowQuota {
    pub used_percent: f64,
    pub remaining_percent: f64,
    pub resets_at: Option<i64>,
    pub window_duration_mins: Option<i64>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Quota {
    pub primary: Option<WindowQuota>,
    pub secondary: Option<WindowQuota>,
    pub plan_type: String,
    pub fetched_at: u64,
}
fn normalize_window(value: &Value) -> Option<WindowQuota> {
    let used = value.get("usedPercent").and_then(Value::as_f64)
        .or_else(|| value.get("remainingPercent").and_then(Value::as_f64).map(|n| 100.0 - n))?;
    if !used.is_finite() { return None; }
    let used = used.round().clamp(0.0, 100.0);
    Some(WindowQuota { used_percent: used, remaining_percent: 100.0 - used,
        resets_at: value.get("resetsAt").and_then(Value::as_i64),
        window_duration_mins: value.get("windowDurationMins").and_then(Value::as_i64) })
}
pub fn normalize(response: &Value) -> Result<Quota, String> {
    let map = response.get("rateLimitsByLimitId");
    let snapshot = map.and_then(|m| m.get("codex")).filter(|v| v.is_object())
        .or_else(|| response.get("rateLimits").filter(|v| v.is_object()))
        .or_else(|| map.and_then(Value::as_object).and_then(|m| m.values().find(|v| v.is_object())))
        .ok_or("Codex did not return quota information.")?;
    Ok(Quota { primary: normalize_window(&snapshot["primary"]), secondary: normalize_window(&snapshot["secondary"]),
        plan_type: snapshot["planType"].as_str().unwrap_or("unknown").to_string(),
        fetched_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 })
}
pub fn resolve_codex() -> PathBuf {
    if let Some(path) = std::env::var_os("CODEX_CLI_PATH") {
        if PathBuf::from(&path).is_file() { return path.into(); }
    }
    let mut candidates = Vec::new();
    if cfg!(target_os = "windows") {
        if let Some(base) = std::env::var_os("LOCALAPPDATA") {
            let bin = PathBuf::from(base).join("OpenAI/Codex/bin");
            if let Ok(dirs) = std::fs::read_dir(&bin) {
                candidates.extend(dirs.flatten().map(|d| d.path().join("codex.exe")).filter(|p| p.is_file()));
                candidates.sort_by_key(|p| std::cmp::Reverse(p.metadata().and_then(|m| m.modified()).ok()));
            }
            candidates.push(bin.join("codex.exe"));
        }
    } else {
        candidates.extend(["/Applications/Codex.app/Contents/Resources/codex", "/opt/homebrew/bin/codex", "/usr/local/bin/codex"].map(PathBuf::from));
        if let Some(home) = std::env::var_os("HOME") {
            let home = PathBuf::from(home);
            candidates.extend(["Applications/Codex.app/Contents/Resources/codex", ".local/bin/codex", ".npm-global/bin/codex", "bin/codex"].map(|p| home.join(p)));
        }
    }
    candidates.into_iter().find(|p| p.is_file()).unwrap_or_else(|| "codex".into())
}

struct Client { child: Child, input: ChildStdin, output: BufReader<ChildStdout>, id: u64 }
impl Client {
    async fn start() -> Result<Self, String> {
        let mut command = Command::new(resolve_codex());
        command.args(["app-server", "--listen", "stdio://"]).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).kill_on_drop(true);
        #[cfg(target_os = "windows")]
        command.creation_flags(0x08000000);
        let mut child = command.spawn().map_err(|_| "Cannot start Codex. Install and sign in to the Codex app first.".to_string())?;
        let input = child.stdin.take().ok_or("Codex stdin unavailable")?;
        let output = BufReader::new(child.stdout.take().ok_or("Codex stdout unavailable")?);
        let mut client = Self { child, input, output, id: 0 };
        client.request("initialize", Some(json!({"clientInfo":{"name":"codex-floating-ball","title":"Codex Floating Ball","version":env!("CARGO_PKG_VERSION")},"capabilities":null}))).await?;
        client.input.write_all(b"{\"method\":\"initialized\"}\n").await.map_err(|_| "Codex connection closed")?;
        Ok(client)
    }
    async fn request(&mut self, method: &str, params: Option<Value>) -> Result<Value, String> {
        self.id += 1;
        let id = self.id;
        let mut message = json!({"id":id,"method":method});
        if let Some(params) = params { message["params"] = params; }
        let mut bytes = serde_json::to_vec(&message).map_err(|_| "Request encoding failed")?;
        bytes.push(b'\n');
        self.input.write_all(&bytes).await.map_err(|_| "Codex connection closed")?;
        loop {
            let mut line = String::new();
            if self.output.read_line(&mut line).await.map_err(|_| "Codex response could not be read")? == 0 { return Err("Codex app-server stopped.".into()); }
            let Ok(value) = serde_json::from_str::<Value>(&line) else { continue; };
            if value["id"].as_u64() != Some(id) { continue; }
            if !value["error"].is_null() { return Err("Codex could not read account limits. Check sign-in and network, then retry.".into()); }
            return Ok(value["result"].clone());
        }
    }
}
impl Drop for Client { fn drop(&mut self) { let _ = self.child.start_kill(); } }
#[derive(Default)]
pub struct QuotaService { client: Mutex<Option<Client>> }
impl QuotaService {
    pub async fn get(&self) -> Result<Quota, String> {
        let mut guard = self.client.lock().await;
        let result = tokio::time::timeout(Duration::from_secs(20), async {
            if guard.is_none() { *guard = Some(Client::start().await?); }
            let response = guard.as_mut().unwrap().request("account/rateLimits/read", None).await?;
            normalize(&response)
        }).await.unwrap_or_else(|_| Err("Reading Codex quota timed out. Check your network and retry.".into()));
        if result.is_err() { *guard = None; }
        result
    }
    pub async fn close(&self) {
        if let Some(mut client) = self.client.lock().await.take() {
            let _ = client.child.kill().await;
            let _ = client.child.wait().await;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn prefers_codex_bucket_and_keeps_weekly_only() {
        let q = normalize(&json!({"rateLimits":{"primary":{"usedPercent":1}},"rateLimitsByLimitId":{"codex":{"planType":"pro","secondary":{"usedPercent":27,"resetsAt":1800000000}}}})).unwrap();
        assert!(q.primary.is_none()); assert_eq!(q.secondary.unwrap().remaining_percent, 73.0); assert_eq!(q.plan_type, "pro");
    }
    #[test] fn normalizes_missing_empty_and_out_of_bounds_windows() {
        let q = normalize(&json!({"rateLimits":{"primary":{},"secondary":{"remainingPercent":120}}})).unwrap();
        assert!(q.primary.is_none()); assert_eq!(q.secondary.unwrap().remaining_percent, 100.0);
        assert!(normalize(&json!({})).is_err());
    }
    #[test] fn preserves_reset_epoch_seconds() {
        let q = normalize(&json!({"rateLimits":{"primary":{"usedPercent":42.5,"windowDurationMins":300,"resetsAt":1800000000}}})).unwrap();
        let w = q.primary.unwrap(); assert_eq!(w.used_percent, 43.0); assert_eq!(w.resets_at, Some(1800000000));
    }
}
