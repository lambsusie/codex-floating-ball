use chrono::{DateTime, SecondsFormat, Utc};
use rusty_leveldb::{LdbIterator, Options, DB};
use serde_json::{json, Map, Value};
use std::{fs, io::{BufRead, BufReader, Write}, path::{Path, PathBuf}};

pub fn now() -> i64 { Utc::now().timestamp_millis() }
pub fn timestamp(value: &Value) -> Option<i64> {
    value.as_i64().or_else(|| value.as_str().and_then(|s| DateTime::parse_from_rfc3339(s).ok()).map(|d| d.timestamp_millis()))
}
pub fn iso(value: i64) -> String {
    DateTime::<Utc>::from_timestamp_millis(value).map(|d| d.to_rfc3339_opts(SecondsFormat::Millis, true)).unwrap_or_default()
}
pub fn read_json(path: &Path) -> Option<Value> { serde_json::from_slice(&fs::read(path).ok()?).ok() }
pub fn write_json(path: &Path, value: &Value) -> Result<(), String> {
    fs::create_dir_all(path.parent().ok_or("Missing parent directory")?).map_err(|e| e.to_string())?;
    let temp = path.with_extension("tmp");
    fs::write(&temp, serde_json::to_vec(value).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())
}
pub fn percent(value: &Value) -> Value {
    value.as_f64().filter(|n| n.is_finite()).map(|n| json!((n.clamp(0.0,100.0)*100.0).round()/100.0)).unwrap_or(Value::Null)
}
pub fn record(quota: &Value) -> Value {
    json!({"timestamp":timestamp(&quota["fetchedAt"]).unwrap_or_else(now),
        "primaryRemaining":percent(&quota["primary"]["remainingPercent"]), "secondaryRemaining":percent(&quota["secondary"]["remainingPercent"]),
        "primaryResetsAt":timestamp(&quota["primary"]["resetsAt"]), "secondaryResetsAt":timestamp(&quota["secondary"]["resetsAt"])})
}
pub fn append_history(profile: &Path, quota: &Value) -> Result<Value, String> {
    let record = record(quota);
    if record["primaryRemaining"].is_null() && record["secondaryRemaining"].is_null() { return Ok(Value::Null); }
    let mut file = fs::OpenOptions::new().create(true).append(true).open(profile.join("quota-history.ndjson")).map_err(|e| e.to_string())?;
    // A leading newline isolates any interrupted final write without losing earlier records.
    writeln!(file, "\n{}", record).map_err(|e| e.to_string())?;
    Ok(record)
}
pub fn history(profile: &Path, range: Option<&Value>) -> Result<Vec<Value>, String> {
    let (start, end, limit) = if let Some(range) = range {
        let start = timestamp(&range["start"]).ok_or("Invalid history start")?;
        let end = timestamp(&range["end"]).ok_or("Invalid history end")?;
        if end <= start || end - start > 370 * 86400000_i64 { return Err("Invalid history range".into()); }
        (start, end, range["maxPoints"].as_u64().unwrap_or(2400).clamp(2,100000) as usize)
    } else { (i64::MIN, i64::MAX, usize::MAX) };
    let file = match fs::File::open(profile.join("quota-history.ndjson")) {
        Ok(file) => file, Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]), Err(e) => return Err(e.to_string())
    };
    let mut points = Vec::new();
    for line in BufReader::new(file).lines() {
        let line = line.map_err(|e| e.to_string())?;
        let Ok(value) = serde_json::from_str::<Value>(&line) else { continue; };
        let Some(time) = timestamp(&value["timestamp"]) else { continue; };
        if time >= start && time < end {
            points.push(json!({"timestamp":time,"primaryRemaining":percent(&value["primaryRemaining"]),"secondaryRemaining":percent(&value["secondaryRemaining"]),
                "primaryResetsAt":timestamp(&value["primaryResetsAt"]),"secondaryResetsAt":timestamp(&value["secondaryResetsAt"])}));
        }
    }
    points.sort_by_key(|p| p["timestamp"].as_i64().unwrap());
    if points.len() > limit {
        return Ok((0..limit).map(|i| points[((i as f64)*(points.len()-1) as f64/(limit-1) as f64).round() as usize].clone()).collect());
    }
    Ok(points)
}
pub fn export_csv(profile: &Path, output: &Path) -> Result<Value, String> {
    let points = history(profile,None)?;
    let mut file = fs::File::create(output).map_err(|e| e.to_string())?;
    file.write_all(b"\xef\xbb\xbftimestamp_iso,timestamp_unix_ms,five_hour_remaining_percent,five_hour_used_percent,five_hour_resets_at,seven_day_remaining_percent,seven_day_used_percent,seven_day_resets_at\r\n").map_err(|e| e.to_string())?;
    for point in &points {
        let mut columns = vec![iso(point["timestamp"].as_i64().unwrap()),point["timestamp"].to_string()];
        for prefix in ["primary","secondary"] {
            let remaining = point[format!("{prefix}Remaining")].as_f64();
            columns.push(remaining.map(|v| v.to_string()).unwrap_or_default());
            columns.push(remaining.map(|v| ((100.0-v)*100.0).round()/100.0).map(|v|v.to_string()).unwrap_or_default());
            columns.push(timestamp(&point[format!("{prefix}ResetsAt")]).map(iso).unwrap_or_default());
        }
        write!(file,"{}\r\n",columns.join(",")).map_err(|e|e.to_string())?;
    }
    Ok(json!({"canceled":false,"filePath":output,"recordCount":points.len()}))
}
pub fn appearance(value: &Value) -> Value {
    fn bound(v: &Value, min:f64,max:f64,fallback:f64) -> f64 { v.as_f64().filter(|n|n.is_finite()).unwrap_or(fallback).round().clamp(min,max) }
    let size = bound(&value["ballSize"],88.0,200.0,120.0);
    let mut quota = bound(&value["quotaFontSize"],20.0,64.0,27.0).min((size*0.35).floor());
    let mut reset = bound(&value["resetFontSize"],9.0,24.0,11.0).min((size*0.14).floor());
    let needed = quota*1.08 + reset*1.25 + 6.0;
    if needed > size*0.58 { let scale = size*0.58/needed; quota = (quota*scale).floor().max(20.0); reset = (reset*scale).floor().max(9.0); }
    json!({"ballSize":size,"quotaFontSize":quota,"resetFontSize":reset})
}
pub fn legacy_dir() -> Option<PathBuf> {
    #[cfg(windows)] { std::env::var_os("APPDATA").map(|p|PathBuf::from(p).join("codex-floating-ball")) }
    #[cfg(target_os="macos")] { std::env::var_os("HOME").map(|p|PathBuf::from(p).join("Library/Application Support/codex-floating-ball")) }
    #[cfg(not(any(windows,target_os="macos")))] { std::env::var_os("HOME").map(|p|PathBuf::from(p).join(".config/codex-floating-ball")) }
}
fn chromium_string(bytes: &[u8]) -> Option<String> {
    match bytes.first()? {
        1 => Some(bytes[1..].iter().map(|b|char::from(*b)).collect()),
        0 if (bytes.len()-1)%2 == 0 => String::from_utf16(&bytes[1..].chunks_exact(2).map(|b|u16::from_le_bytes([b[0],b[1]])).collect::<Vec<_>>()).ok(),
        _ => None
    }
}
pub fn import_preferences(legacy: &Path, destination: &Path) -> Result<Map<String,Value>,String> {
    let source = legacy.join("Local Storage/leveldb");
    if !source.is_dir() { return Ok(Map::new()); }
    let snapshot = destination.join(format!("legacy-settings-snapshot-{}",now()));
    fs::create_dir_all(&snapshot).map_err(|e|e.to_string())?;
    for entry in fs::read_dir(source).map_err(|e|e.to_string())?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name == "CURRENT" || name.starts_with("MANIFEST-") || ["ldb","sst","log"].contains(&entry.path().extension().and_then(|e|e.to_str()).unwrap_or("")) {
            fs::copy(entry.path(),snapshot.join(name)).map_err(|e|e.to_string())?;
        }
    }
    let mut options = Options::default(); options.create_if_missing = false;
    let mut db = DB::open(&snapshot,options).map_err(|e|e.to_string())?;
    let mut iterator = db.new_iter().map_err(|e|e.to_string())?;
    let mut result = Map::new();
    while let Some((key,value)) = iterator.next() {
        if key.first() != Some(&b'_') { continue; }
        if let Some(separator) = key.iter().position(|b|*b == 0) {
            if let (Some(key),Some(value)) = (chromium_string(&key[separator+1..]),chromium_string(&value)) {
                if key.starts_with("codex-led-") { result.insert(key,json!(value)); }
            }
        }
    }
    Ok(result)
}
pub fn migrate(profile: &Path, legacy: Option<&Path>) -> Value {
    if let Some(existing) = read_json(&profile.join("migration.json")) { return existing; }
    let Some(legacy) = legacy.filter(|p|p.is_dir()) else { return json!({"status":"no-legacy"}); };
    let mut copied = Vec::new(); let mut warnings = Vec::new();
    for name in ["settings.json","quota-history.ndjson","token-reports.json","token-usage-index.json"] {
        if legacy.join(name).is_file() && !profile.join(name).exists() {
            match fs::copy(legacy.join(name),profile.join(name)) { Ok(_) => copied.push(name),Err(e) => warnings.push(format!("{name}: {e}")) }
        }
    }
    let mut settings = read_json(&profile.join("settings.json")).filter(Value::is_object).unwrap_or(json!({}));
    match import_preferences(legacy,profile) {
        Ok(values) => { if settings["uiPreferences"].is_null() { settings["uiPreferences"] = json!(values); } },
        Err(e) => warnings.push(format!("Preferences snapshot: {e}"))
    }
    if let Err(e) = write_json(&profile.join("settings.json"),&settings) { warnings.push(e); }
    let result = json!({"status":if warnings.is_empty(){"imported"}else{"partial"},"source":legacy,"copied":copied,"preferenceCount":settings["uiPreferences"].as_object().map(|p|p.len()).unwrap_or(0),"warnings":warnings,"at":now()});
    let _ = write_json(&profile.join("migration.json"),&result);
    result
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn time_and_layout() {
        assert_eq!(timestamp(&json!("2026-10-01T16:00:00Z")),Some(1790870400000));
        let a=appearance(&json!({"ballSize":88,"quotaFontSize":64,"resetFontSize":24}));
        assert!(a["quotaFontSize"].as_f64().unwrap()*1.08+a["resetFontSize"].as_f64().unwrap()*1.25+6.0 <= 88.0*0.58);
        assert_eq!(chromium_string(b"\x01codex-led-lang"),Some("codex-led-lang".into()));
        assert_eq!(chromium_string(&[0,0x2d,0x4e]),Some("中".into()));
    }
    #[test] fn history_missing_window() { let p=record(&json!({"fetchedAt":1,"secondary":{"remainingPercent":25}})); assert!(p["primaryRemaining"].is_null()); assert_eq!(p["secondaryRemaining"],25.0); }
    #[test] fn history_recovery_sampling_and_csv() {
        let root=std::env::temp_dir().join(format!("cfb-history-{}-{}",std::process::id(),now()));fs::create_dir_all(&root).unwrap();
        let path=root.join("quota-history.ndjson");
        fs::write(&path,"{\"timestamp\":3,\"primaryRemaining\":80}\n{\"timestamp\":1,\"secondaryRemaining\":50}\n{interrupted").unwrap();
        append_history(&root,&json!({"fetchedAt":2,"primary":{"remainingPercent":70,"resetsAt":"2026-10-01T16:00:00Z"}})).unwrap();
        let points=history(&root,None).unwrap();assert_eq!(points.len(),3);assert_eq!(points[0]["timestamp"],1);assert_eq!(points[2]["timestamp"],3);
        let sampled=history(&root,Some(&json!({"start":0,"end":4,"maxPoints":2}))).unwrap();assert_eq!(sampled,vec![points[0].clone(),points[2].clone()]);
        let csv=root.join("history.csv");assert_eq!(export_csv(&root,&csv).unwrap()["recordCount"],3);
        let content=fs::read_to_string(&csv).unwrap();assert!(content.starts_with('\u{feff}'));assert!(content.contains("2026-10-01T16:00:00.000Z"));
        fs::remove_file(path).unwrap();fs::remove_file(csv).unwrap();fs::remove_dir(root).unwrap();
    }
}
