use crate::storage::{read_json,write_json,now};
use serde_json::{json,Value};
use std::{fs,io::{BufRead,BufReader,Read,Seek,SeekFrom},path::{Path,PathBuf},time::UNIX_EPOCH};

pub fn day_start(time:i64)->i64 { (time+8*3600000).div_euclid(86400000)*86400000-8*3600000 }
pub fn codex_home()->PathBuf {
    std::env::var_os("CODEX_HOME").map(PathBuf::from).unwrap_or_else(|| {
        PathBuf::from(std::env::var_os(if cfg!(windows){"USERPROFILE"}else{"HOME"}).unwrap_or_default()).join(".codex")
    })
}
fn list(directory:&Path, files:&mut Vec<PathBuf>, errors:&mut u64) {
    let entries=match fs::read_dir(directory) { Ok(v)=>v,Err(e)=>{if e.kind()!=std::io::ErrorKind::NotFound {*errors+=1;}return;} };
    for entry in entries {
        let Ok(entry)=entry else {*errors+=1;continue;};
        let Ok(kind)=entry.file_type() else {*errors+=1;continue;};
        if kind.is_dir() {list(&entry.path(),files,errors);}
        else if kind.is_file() && entry.path().extension().and_then(|e|e.to_str())==Some("jsonl") {files.push(entry.path());}
    }
}
fn usage(value:&Value)->Value {
    if !value.is_object() {return Value::Null;}
    let mut result=serde_json::Map::new();
    for key in ["input_tokens","cached_input_tokens","cache_write_input_tokens","output_tokens","reasoning_output_tokens","total_tokens"] {
        if let Some(v)=value.get(key) {result.insert(key.into(), if v.is_number() || v.is_null(){v.clone()}else{json!("invalid")});}
    }
    Value::Object(result)
}
fn identifier(value:&Value)->Value {value.as_str().filter(|s|s.len()<=256).map(|s|json!(s)).unwrap_or(Value::Null)}
pub fn read_file(path:&Path, previous:&Value)->Result<Value,String> {
    let mut file=fs::File::open(path).map_err(|e|e.to_string())?;
    let stat=file.metadata().map_err(|e|e.to_string())?;
    let size=stat.len();
    let modified=stat.modified().ok().and_then(|m|m.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_nanos().to_string()).unwrap_or_default();
    let created=stat.created().ok().and_then(|m|m.duration_since(UNIX_EPOCH).ok()).map(|d|d.as_nanos().to_string()).unwrap_or_default();
    let reusable=previous["readerVersion"]==2 && previous["created"]==created && size>=previous["offset"].as_u64().unwrap_or(u64::MAX)
        && !(previous["size"].as_u64()==Some(size) && previous["modified"]!=modified);
    let mut data=if reusable {previous.clone()}else{json!({"offset":0,"events":[],"meta":{},"invalid":0,"line":0})};
    if reusable && previous["size"].as_u64()==Some(size) && previous["modified"]==modified {return Ok(data);}
    let mut offset=data["offset"].as_u64().unwrap_or(0);
    let mut line_no=data["line"].as_u64().unwrap_or(0);
    let mut invalid=data["invalid"].as_u64().unwrap_or(0);
    file.seek(SeekFrom::Start(offset)).map_err(|e|e.to_string())?;
    let mut reader=BufReader::new(file.take(size-offset));
    let mut tail=false;
    loop {
        let mut bytes=Vec::new();
        let count=(&mut reader).take(16*1024*1024).read_until(b'\n',&mut bytes).map_err(|e|e.to_string())?;
        if count==0 {break;}
        if bytes.last()!=Some(&b'\n') {
            if count==16*1024*1024 {
                let rest=reader.skip_until(b'\n').map_err(|e|e.to_string())?;
                if rest>0 {offset+=(count+rest) as u64;line_no+=1;continue;}
            }
            tail=true;break;
        }
        offset+=count as u64;line_no+=1;
        let prefix=String::from_utf8_lossy(&bytes[..bytes.len().min(512)]);
        if !["\"session_meta\"","\"token_count\"","\"token_usage_record\""].iter().any(|p|prefix.contains(p)) {continue;}
        let obj=match serde_json::from_slice::<Value>(&bytes) {Ok(v)=>v,Err(_)=>{invalid+=1;continue;}};
        let p=&obj["payload"];
        if obj["type"]=="session_meta" {
            data["meta"]=json!({"id":identifier(&p["id"]),"parent":identifier(p.get("forked_from_id").or(p.get("parent_thread_id")).unwrap_or(&Value::Null))});
            continue;
        }
        let time=obj["timestamp"].as_str().filter(|s|chrono::DateTime::parse_from_rfc3339(s).is_ok());
        let event=if obj["type"]=="token_usage_record" {
            Some(json!({"type":"ledger","timestamp":time,"line":line_no,"session":identifier(&p["thread_id"]),"response":identifier(&p["response_id"]),"usage":usage(&p["usage"])}))
        } else if obj["type"]=="event_msg" && p["type"]=="token_count" && p["info"].is_object() {
            Some(json!({"type":"snapshot","timestamp":time,"line":line_no,"total":usage(&p["info"]["total_token_usage"]),"last":usage(&p["info"]["last_token_usage"])}))
        } else {None};
        if let Some(event)=event {data["events"].as_array_mut().ok_or("Invalid token cache")?.push(event);}
    }
    data["offset"]=json!(offset);data["size"]=json!(size);data["modified"]=json!(modified);data["created"]=json!(created);
    data["tailPending"]=json!(tail);data["line"]=json!(line_no);data["invalid"]=json!(invalid);data["readerVersion"]=json!(2);
    Ok(data)
}
pub fn scan(profile:&Path,root:&Path)->Result<Value,String> {
    let cache_path=profile.join("token-usage-index.json");
    let previous=read_json(&cache_path).unwrap_or(json!({}));
    let mut entries=if previous["root"].as_str()==root.to_str(){previous["entries"].as_object().cloned().unwrap_or_default()}else{Default::default()};
    let mut files=Vec::new();let mut errors=0;
    list(&root.join("sessions"),&mut files,&mut errors);list(&root.join("archived_sessions"),&mut files,&mut errors);files.sort();
    for file in &files {
        let key=file.strip_prefix(root).map_err(|e|e.to_string())?.to_string_lossy().to_string();
        match read_file(file,entries.get(&key).unwrap_or(&Value::Null)) {Ok(entry)=>{entries.insert(key,entry);},Err(_)=>errors+=1}
    }
    // Retain earlier indexed usage when logs are archived or removed; aggregate deduplicates IDs.
    write_json(&cache_path,&json!({"schemaVersion":1,"root":root,"entries":entries}))?;
    let status=if errors>0{"partial"}else if entries.is_empty(){"missing"}else{"ready"};
    Ok(json!({"entries":entries,"now":now(),"sourceStatus":status,"readErrorCount":errors,"fileCount":files.len()}))
}

#[cfg(test)] mod tests {
    use super::*;
    #[test] fn beijing_settlement() {assert_eq!(day_start(1790870400000),1790870400000);assert_eq!(day_start(1790870399999),1790784000000);}
    #[test] fn reader_partial_privacy_and_replacement() {
        let root=std::env::temp_dir().join(format!("cfb-rust-reader-{}-{}",std::process::id(),now()));fs::create_dir_all(&root).unwrap();
        let file=root.join("a.jsonl");let meta="{\"type\":\"session_meta\",\"payload\":{\"id\":\"a\"}}\n";
        let event="{\"type\":\"token_usage_record\",\"timestamp\":\"2026-10-01T01:00:00Z\",\"payload\":{\"thread_id\":\"a\",\"response_id\":\"r1\",\"usage\":{\"input_tokens\":100,\"output_tokens\":10,\"total_tokens\":110}}}\n";
        fs::write(&file,format!("{meta}{{\"type\":\"response_item\",\"text\":\"PRIVATE TEXT\"}}\n{}",&event[..30])).unwrap();
        let first=read_file(&file,&Value::Null).unwrap();assert_eq!(first["events"].as_array().unwrap().len(),0);assert_eq!(first["tailPending"],true);
        use std::io::Write;fs::OpenOptions::new().append(true).open(&file).unwrap().write_all(event[30..].as_bytes()).unwrap();
        let second=read_file(&file,&first).unwrap();assert_eq!(second["events"].as_array().unwrap().len(),1);assert!(!second.to_string().contains("PRIVATE TEXT"));
        assert_eq!(read_file(&file,&second).unwrap(),second);fs::write(&file,meta).unwrap();assert_eq!(read_file(&file,&second).unwrap()["events"].as_array().unwrap().len(),0);
        fs::remove_file(&file).unwrap();fs::remove_dir(&root).unwrap();
    }
}
