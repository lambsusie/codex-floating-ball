#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod quota;
mod storage;
mod reports;
use serde_json::{json,Value};
use std::{path::PathBuf,sync::{Mutex,atomic::{AtomicBool,AtomicI64,Ordering}}};
use tauri::{Emitter,Manager,WebviewWindow,LogicalSize,PhysicalPosition,menu::{Menu,MenuItem},tray::{TrayIconBuilder,TrayIconEvent,MouseButton,MouseButtonState}};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_notification::NotificationExt;
const VERSION:&str=env!("CARGO_PKG_VERSION");
const RELEASES:&str="https://github.com/lambsusie/codex-floating-ball/releases";
struct Ui {settings:Value,mode:String,view:String,pinned:bool,history_pinned:bool,alert:bool}
struct State {
    ui:Mutex<Ui>, profile:PathBuf, codex_home:PathBuf, migration:Value, quota:quota::QuotaService,
    qa:bool,mock:Mutex<Option<Value>>,quitting:AtomicBool,modal:AtomicBool,dirty:AtomicBool,
    scanning:AtomicBool,scan_started:AtomicI64,scan_failed:AtomicBool,history_lock:Mutex<()>,update:Mutex<Option<Value>>,
}
fn settings(state:&State)->Result<Value,String>{Ok(state.ui.lock().map_err(|_|"Settings unavailable")?.settings.clone())}
fn save_setting(state:&State,key:&str,value:Value)->Result<(),String>{
    let mut ui=state.ui.lock().map_err(|_|"Settings unavailable")?;ui.settings[key]=value;
    storage::write_json(&state.profile.join("settings.json"),&ui.settings)
}
fn off_taskbar(window:&WebviewWindow)->Result<(),String>{
    window.set_skip_taskbar(true).map_err(|e|e.to_string())?;
    #[cfg(windows)] unsafe {
        use windows_sys::Win32::{Foundation::{GetLastError,SetLastError},UI::WindowsAndMessaging::*};
        let hwnd=window.hwnd().map_err(|e|e.to_string())?.0;
        let style=GetWindowLongPtrW(hwnd,GWL_EXSTYLE);SetLastError(0);
        if SetWindowLongPtrW(hwnd,GWL_EXSTYLE,(style & !(WS_EX_APPWINDOW as isize)) | WS_EX_TOOLWINDOW as isize)==0 && GetLastError()!=0{return Err("Cannot set tool window".into());}
    }
    Ok(())
}
fn pin(window:&WebviewWindow,state:&State)->Result<(),String>{
    let top={let ui=state.ui.lock().map_err(|_|"Window unavailable")?;if ui.mode=="detail"&&ui.view=="history"{ui.history_pinned}else{ui.pinned}};
    window.set_always_on_top(top).map_err(|e|e.to_string())?;off_taskbar(window)
}
fn clamp_position(window:&WebviewWindow,x:i32,y:i32)->Result<(),String>{
    let mut x=x;let mut y=y;
    let monitor=window.available_monitors().ok().and_then(|monitors|monitors.into_iter().find(|m|{let a=m.work_area();x>=a.position.x&&y>=a.position.y&&x<a.position.x+a.size.width as i32&&y<a.position.y+a.size.height as i32})).or_else(||window.current_monitor().ok().flatten()).or_else(||window.primary_monitor().ok().flatten());
    if let (Some(m),Ok(size))=(monitor,window.outer_size()) {let a=m.work_area();x=x.clamp(a.position.x,(a.position.x+a.size.width as i32-size.width as i32).max(a.position.x));y=y.clamp(a.position.y,(a.position.y+a.size.height as i32-size.height as i32).max(a.position.y));}
    window.set_position(PhysicalPosition::new(x,y)).map_err(|e|e.to_string())
}
fn resize(window:&WebviewWindow,state:&State)->Result<(),String>{
    let (mode,appearance,alert)={let ui=state.ui.lock().map_err(|_|"Window unavailable")?;(ui.mode.clone(),storage::appearance(&ui.settings["compactAppearance"]),ui.alert)};
    let ball=appearance["ballSize"].as_f64().unwrap();let (w,h)=if mode=="detail"{(520.0,360.0)}else{(ball+12.0+if alert{94.0}else{0.0},ball+12.0)};
    let before=window.outer_size().map_err(|e|e.to_string())?;let pos=window.outer_position().map_err(|e|e.to_string())?;
    window.set_size(LogicalSize::new(w,h)).map_err(|e|e.to_string())?;
    let after=window.outer_size().map_err(|e|e.to_string())?;
    clamp_position(window,pos.x+before.width as i32-after.width as i32,pos.y)?;pin(window,state)
}
fn reduced_transparency()->bool {
    #[cfg(target_os="macos")] {objc2_app_kit::NSWorkspace::sharedWorkspace().accessibilityDisplayShouldReduceTransparency()}
    #[cfg(not(target_os="macos"))] {false}
}
#[cfg(target_os="macos")]
fn apply_glass(window:&WebviewWindow,detail:bool) {
    let effect=if detail&&!reduced_transparency() {
        Some(tauri::window::EffectsBuilder::new()
            .effect(tauri::utils::WindowEffect::LiquidGlassRegular)
            .effect(tauri::utils::WindowEffect::UnderWindowBackground)
            .state(tauri::utils::WindowEffectState::Active).radius(16.0).build())
    } else {None};
    let _=window.set_effects(effect);
}
fn mode(window:&WebviewWindow,state:&State,value:&str,focus:bool)->Result<Value,String>{
    if !["compact","detail"].contains(&value){return Err("Invalid window mode".into());}
    let changed={let mut ui=state.ui.lock().map_err(|_|"Window unavailable")?;let changed=ui.mode!=value;ui.mode=value.into();if value=="compact"{ui.view="main".into();ui.history_pinned=false;}changed};
    resize(window,state)?;
    #[cfg(target_os="macos")] apply_glass(window,value=="detail");
    if changed{window.emit("window:modeChanged",value).map_err(|e|e.to_string())?;}
    if !state.qa{window.show().map_err(|e|e.to_string())?;if focus{window.set_focus().map_err(|e|e.to_string())?;}}
    off_taskbar(window)?;Ok(json!(value))
}
fn theme(window:&WebviewWindow,state:&State)->Result<Value,String>{
    let value=settings(state)?;let source=value["themeSource"].as_str().filter(|v|["system","light","dark"].contains(v)).unwrap_or("system");
    let resolved=if source=="system"{if window.theme().ok()==Some(tauri::Theme::Dark){"dark"}else{"light"}}else{source};
    let platform=if cfg!(windows){"win32"}else if cfg!(target_os="macos"){"darwin"}else{"linux"};
    let reduced=reduced_transparency();
    Ok(json!({"source":source,"resolvedTheme":resolved,"platform":platform,"prefersReducedTransparency":reduced,"glassEnabled":cfg!(target_os="macos")&&!reduced}))
}
fn quota_value(q:quota::Quota)->Value{
    let mut q=serde_json::to_value(q).unwrap();
    for kind in ["primary","secondary"]{if let Some(t)=q[kind]["resetsAt"].as_i64(){q[kind]["resetsAt"]=json!(storage::iso(t*1000));}}
    let current=if q["primary"].is_object(){q["primary"].clone()}else{q["secondary"].clone()};
    q["quotaMode"]=json!(if q["primary"].is_object(){"dual"}else if q["secondary"].is_object(){"weekly-only"}else{"unavailable"});
    q["hasFiveHourLimit"]=json!(q["primary"].is_object());q["limitId"]=json!("codex");q["limitName"]=json!("Codex");
    for key in ["usedPercent","remainingPercent","resetsAt"]{q[key]=current[key].clone();}
    q["fetchedAt"]=json!(storage::iso(q["fetchedAt"].as_i64().unwrap_or_else(storage::now)));q
}
fn tray_state(app:&tauri::AppHandle,value:&str)->Result<(),String>{
    if let Some(tray)=app.tray_by_id("main-tray"){
        #[cfg(not(target_os="macos"))] {let bytes:&[u8]=match value{"normal"=>include_bytes!("../icons/tray-normal.png"),"warning"=>include_bytes!("../icons/tray-warning.png"),"error"=>include_bytes!("../icons/tray-error.png"),_=>include_bytes!("../icons/tray-offline.png")};tray.set_icon(Some(tauri::image::Image::from_bytes(bytes).map_err(|e|e.to_string())?)).map_err(|e|e.to_string())?;}
        tray.set_tooltip(Some(format!("Codex Floating Ball ({value})"))).map_err(|e|e.to_string())?;
    }Ok(())
}
async fn update_check(state:&State)->Result<Value,String>{
    let client=reqwest::Client::builder().timeout(std::time::Duration::from_secs(15)).redirect(reqwest::redirect::Policy::none()).user_agent(format!("Codex-Floating-Ball/{VERSION}")).build().map_err(|e|e.to_string())?;
    let release:Value=client.get("https://api.github.com/repos/lambsusie/codex-floating-ball/releases/latest").header("Accept","application/vnd.github+json").send().await.map_err(|_|"Update check failed; check your network")?.error_for_status().map_err(|_|"GitHub update service unavailable")?.json().await.map_err(|_|"Invalid update response")?;
    let result=release_result(&release)?;
    *state.update.lock().map_err(|_|"Update unavailable")?=Some(result.clone());Ok(result)
}
fn release_result(release:&Value)->Result<Value,String>{
    let version=release["tag_name"].as_str().unwrap_or("").trim_start_matches('v');let url=release["html_url"].as_str().unwrap_or("");
    let latest=semver::Version::parse(version).map_err(|_|"Invalid release version")?;
    if !url.starts_with("https://github.com/lambsusie/codex-floating-ball/releases/tag/"){return Err("Invalid release URL".into());}
    let result=json!({"currentVersion":VERSION,"latestVersion":version,"releaseUrl":url,"updateAvailable":latest>semver::Version::parse(VERSION).unwrap()});
    Ok(result)
}

#[tauri::command]
async fn call(app:tauri::AppHandle,window:WebviewWindow,state:tauri::State<'_,State>,method:String,value:Option<Value>)->Result<Value,String>{
    let value=value.unwrap_or(Value::Null);
    match method.as_str(){
        "bootstrap"=>Ok(json!({"preferences":settings(&state)?["uiPreferences"],"migration":state.migration,"qa":state.qa})),
        "settings:ui"=>{
            let values=value.as_object().ok_or("Invalid UI settings")?;
            if values.len()>100 || values.iter().any(|(k,v)|!k.starts_with("codex-led-")||v.as_str().map(|s|s.len()>4096).unwrap_or(true)){return Err("Invalid UI settings".into());}
            save_setting(&state,"uiPreferences",value)?;Ok(Value::Null)
        },
        "quota:get"=>{
            let mock=state.mock.lock().map_err(|_|"Quota unavailable")?.clone();
            let q=if let Some(snapshot)=mock {quota::normalize(&snapshot)?}else{state.quota.get().await?};Ok(quota_value(q))
        },
        "window:mode:get"=>Ok(json!(state.ui.lock().map_err(|_|"Window unavailable")?.mode)),
        "window:mode:set"=>mode(&window,&state,value.as_str().unwrap_or(""),true),
        "window:minimize"=>mode(&window,&state,"compact",false),
        "window:close"=>{state.quitting.store(true,Ordering::Relaxed);state.quota.close().await;app.exit(0);Ok(Value::Null)},
        "window:drag"=>{window.start_dragging().map_err(|e|e.to_string())?;Ok(Value::Null)},
        "window:alwaysOnTop:get"=>Ok(json!(state.ui.lock().map_err(|_|"Window unavailable")?.pinned)),
        "window:alwaysOnTop:set"=>{
            let pinned=value.as_bool().unwrap_or(false);state.ui.lock().map_err(|_|"Window unavailable")?.pinned=pinned;
            save_setting(&state,"alwaysOnTop",json!(pinned))?;pin(&window,&state)?;window.emit("window:alwaysOnTopChanged",pinned).map_err(|e|e.to_string())?;Ok(json!(pinned))
        },
        "window:detailView:set"|"window:historyPinned:set"=>{
            let pinned={let mut ui=state.ui.lock().map_err(|_|"Window unavailable")?;
                if method=="window:detailView:set"{ui.view=value.as_str().filter(|v|["main","settings","history","reports"].contains(v)).unwrap_or("main").into();if ui.view!="history"{ui.history_pinned=false;}}
                else{ui.history_pinned=ui.mode=="detail"&&ui.view=="history"&&value.as_bool().unwrap_or(false);}ui.history_pinned};
            pin(&window,&state)?;window.emit("window:historyPinnedChanged",pinned).map_err(|e|e.to_string())?;Ok(json!(pinned))
        },
        "window:compactAlert:set"=>{let alert=value.as_bool().unwrap_or(false);let changed={let mut ui=state.ui.lock().map_err(|_|"Window unavailable")?;let c=ui.alert!=alert;ui.alert=alert;c};if changed{resize(&window,&state)?;}Ok(json!(alert))},
        "window:moveBy"=>{let scale=window.scale_factor().unwrap_or(1.0);let p=window.outer_position().map_err(|e|e.to_string())?;let dx=value["dx"].as_f64().unwrap_or(0.0).clamp(-2000.0,2000.0);let dy=value["dy"].as_f64().unwrap_or(0.0).clamp(-2000.0,2000.0);clamp_position(&window,p.x+(dx*scale).round() as i32,p.y+(dy*scale).round() as i32)?;Ok(Value::Null)},
        "settings:autoRefresh:get"=>Ok(settings(&state)?["autoRefreshMinutes"].as_u64().filter(|v|[0,1,5,10,30,60].contains(v)).map(|v|json!(v)).unwrap_or(json!(5))),
        "settings:autoRefresh:set"=>{let n=value.as_u64().filter(|v|[0,1,5,10,30,60].contains(v)).ok_or("Invalid refresh interval")?;save_setting(&state,"autoRefreshMinutes",json!(n))?;Ok(json!(n))},
        "settings:compactAppearance:get"=>Ok(storage::appearance(&settings(&state)?["compactAppearance"])),
        "settings:compactAppearance:set"=>{let a=storage::appearance(&value);save_setting(&state,"compactAppearance",a.clone())?;resize(&window,&state)?;Ok(a)},
        "theme:get"=>theme(&window,&state),
        "theme:set"=>{let source=value.as_str().filter(|v|["system","light","dark"].contains(v)).unwrap_or("system");save_setting(&state,"themeSource",json!(source))?;window.set_theme(match source{"light"=>Some(tauri::Theme::Light),"dark"=>Some(tauri::Theme::Dark),_=>None}).map_err(|e|e.to_string())?;let value=theme(&window,&state)?;window.emit("theme:changed",&value).map_err(|e|e.to_string())?;Ok(value)},
        "history:record"=>{let _lock=state.history_lock.lock().map_err(|_|"History unavailable")?;storage::append_history(&state.profile,&value)},
        "history:get"=>{let profile=state.profile.clone();tauri::async_runtime::spawn_blocking(move||storage::history(&profile,Some(&value)).map(|v|json!(v))).await.map_err(|e|e.to_string())?},
        "history:export"=>{
            state.modal.store(true,Ordering::Relaxed);let handle=app.clone();let qa=state.qa;let profile=state.profile.clone();let language=value.as_str().unwrap_or("zh").to_owned();
            let result=tauri::async_runtime::spawn_blocking(move||{
                let path=if qa{Some(profile.join("qa-export.csv"))}else{handle.dialog().file().set_title(if language=="en"{"Export quota history"}else{"导出额度历史"}).set_file_name(format!("Codex-quota-history-{}.csv",chrono::Utc::now().format("%Y-%m-%d"))).add_filter("CSV",&["csv"]).blocking_save_file().and_then(|p|p.into_path().ok())};
                let Some(mut path)=path else{return Ok(json!({"canceled":true}));};if path.extension().and_then(|v|v.to_str())!=Some("csv"){path.set_extension("csv");}storage::export_csv(&profile,&path)
            }).await.map_err(|e|e.to_string());state.modal.store(false,Ordering::Relaxed);result?
        },
        "reports:get"=>Ok(json!({"store":storage::read_json(&state.profile.join("token-reports.json")),"scanning":state.scanning.load(Ordering::Relaxed),"failed":state.scan_failed.load(Ordering::Relaxed)})),
        "reports:scan"=>{
            if state.scanning.swap(true,Ordering::Relaxed){return Ok(Value::Null);}
            state.scan_started.store(storage::now(),Ordering::Relaxed);state.scan_failed.store(false,Ordering::Relaxed);
            let profile=state.profile.clone();let root=state.codex_home.clone();let result=tauri::async_runtime::spawn_blocking(move||reports::scan(&profile,&root)).await.map_err(|e|e.to_string()).and_then(|v|v);
            if result.is_err(){state.scanning.store(false,Ordering::Relaxed);state.scan_failed.store(true,Ordering::Relaxed);}result
        },
        "reports:commit"=>{
            if !state.scanning.load(Ordering::Relaxed)||value["schemaVersion"]!=1||!value["days"].is_object(){return Err("Invalid report result".into());}
            storage::write_json(&state.profile.join("token-reports.json"),&value)?;
            state.scanning.store(false,Ordering::Relaxed);window.emit("reports:updated",()).map_err(|e|e.to_string())?;Ok(Value::Null)
        },
        "reports:fail"=>{state.scanning.store(false,Ordering::Relaxed);state.scan_failed.store(true,Ordering::Relaxed);window.emit("reports:updated",()).map_err(|e|e.to_string())?;Ok(Value::Null)},
        "tray:state"=>{tray_state(&app,value.as_str().unwrap_or("offline"))?;Ok(Value::Null)},
        "app:version"=>Ok(json!(VERSION)),
        "updates:check"=>update_check(&state).await,
        "updates:open"=>{let url=state.update.lock().map_err(|_|"Update unavailable")?.as_ref().and_then(|v|v["releaseUrl"].as_str()).unwrap_or(RELEASES).to_string();app.opener().open_url(url,None::<&str>).map_err(|e|e.to_string())?;Ok(Value::Null)},
        "updates:notify"=>{
            let result=state.update.lock().map_err(|_|"Update unavailable")?.clone();let Some(update)=result.filter(|v|v["updateAvailable"]==true)else{return Ok(json!(false));};
            if state.qa{return Ok(json!(false));}let en=value=="en";
            app.notification().builder().title(if en{"Codex Floating Ball update"}else{"Codex Floating Ball 有新版本"}).body(format!("v{} {}",update["latestVersion"].as_str().unwrap_or(""),if en{"is available. Open Settings to download."}else{"已发布，请在设置中查看新版。"})).show().map_err(|e|e.to_string())?;Ok(json!(true))
        },
        "external:openCodex"=>{app.opener().open_url("codex://",None::<&str>).map_err(|e|e.to_string())?;Ok(Value::Null)},
        "qa:quota" if state.qa=>{*state.mock.lock().map_err(|_|"Quota unavailable")?=Some(value);Ok(Value::Null)},
        "qa:diagnostics" if state.qa=>{let data={let ui=state.ui.lock().map_err(|_|"State unavailable")?;json!({"mode":ui.mode,"view":ui.view,"pinned":ui.pinned,"historyPinned":ui.history_pinned,"profile":state.profile,"migration":state.migration})};Ok(json!({"state":data,"size":window.inner_size().ok(),"position":window.outer_position().ok(),"topmost":window.is_always_on_top().ok()}))},
        _=>Err("Unsupported command".into())
    }
}
fn tray_action(app:&tauri::AppHandle,id:&str){
    let id=id.to_owned();let app=app.clone();tauri::async_runtime::spawn(async move{
        let state=app.state::<State>();let Some(window)=app.get_webview_window("main")else{return;};
        match id.as_str(){
            "quit"=>{state.quitting.store(true,Ordering::Relaxed);state.quota.close().await;app.exit(0);},
            "refresh"=>{let _=window.emit("quota:refresh",());},
            "pin"=>{let pinned={let mut ui=state.ui.lock().unwrap();ui.pinned=!ui.pinned;ui.pinned};let _=save_setting(&state,"alwaysOnTop",json!(pinned));let _=pin(&window,&state);let _=window.emit("window:alwaysOnTopChanged",pinned);},
            _=>{let target={let ui=state.ui.lock().unwrap();if ui.mode=="compact"{"detail"}else{"compact"}};let _=mode(&window,&state,target,true);}
        }
    });
}
fn main(){
    let args:Vec<String>=std::env::args().collect();let arg=|flag:&str|args.iter().position(|s|s==flag).and_then(|i|args.get(i+1)).cloned();
    let qa_profile=arg("--qa-profile").map(PathBuf::from);let qa=qa_profile.is_some();
    let port=if qa{arg("--qa-debug-port").and_then(|s|s.parse::<u16>().ok())}else{None};
    let legacy_override=if qa{arg("--qa-legacy").map(PathBuf::from)}else{storage::legacy_dir()};
    let codex_home=if qa{arg("--qa-codex-home").map(PathBuf::from).unwrap_or_else(||qa_profile.as_ref().unwrap().join("empty-codex"))}else{reports::codex_home()};
    let mock=if qa&&args.iter().any(|s|s=="--mock-quota"){Some(json!({"rateLimits":{"primary":{"usedPercent":32,"resetsAt":storage::now()/1000+12600,"windowDurationMins":300},"secondary":{"usedPercent":61,"resetsAt":storage::now()/1000+300000},"planType":"plus"}}))}else{None};
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,_,_|tray_action(app,"toggle")))
        .plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_notification::init())
        .setup(move|app|{
            let profile=qa_profile.clone().unwrap_or(app.path().app_config_dir()?);std::fs::create_dir_all(&profile)?;
            let migration=storage::migrate(&profile,legacy_override.as_deref());
            let settings=storage::read_json(&profile.join("settings.json")).filter(Value::is_object).unwrap_or(json!({}));
            let appearance=storage::appearance(&settings["compactAppearance"]);let size=appearance["ballSize"].as_f64().unwrap()+12.0;
            let pinned=settings["alwaysOnTop"].as_bool().unwrap_or(true);let bounds=settings["windowBounds"].clone();
            app.manage(State{ui:Mutex::new(Ui{settings,mode:"compact".into(),view:"main".into(),pinned,history_pinned:false,alert:false}),profile:profile.clone(),codex_home:codex_home.clone(),migration,quota:quota::QuotaService::default(),qa,mock:Mutex::new(mock.clone()),quitting:AtomicBool::new(false),modal:AtomicBool::new(false),dirty:AtomicBool::new(false),scanning:AtomicBool::new(false),scan_started:AtomicI64::new(0),scan_failed:AtomicBool::new(false),history_lock:Mutex::new(()),update:Mutex::new(None)});
            let mut builder=tauri::WebviewWindowBuilder::new(app,"main",tauri::WebviewUrl::App("index.html".into())).title("Codex Floating Ball").inner_size(size,size)
                .transparent(true).decorations(false).shadow(false).resizable(false).skip_taskbar(true).always_on_top(pinned).visible(!qa).focused(false).data_directory(profile.join("webview"))
                .on_navigation(|url|url.scheme()=="tauri"||url.host_str()==Some("tauri.localhost"));
            let mut browser_args="--disable-background-timer-throttling --disable-renderer-backgrounding".to_owned();
            if let Some(port)=port{browser_args.push_str(&format!(" --remote-debugging-address=127.0.0.1 --remote-debugging-port={port}"));}
            builder=builder.additional_browser_args(&browser_args);let window=builder.build()?;off_taskbar(&window)?;
            #[cfg(target_os="macos")] {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }
            if let Some(monitor)=window.primary_monitor()?{let area=monitor.work_area();let scale=monitor.scale_factor();let x=bounds["x"].as_f64().map(|v|(v*scale) as i32).unwrap_or(area.position.x+area.size.width as i32-(size*scale) as i32-24);let y=bounds["y"].as_f64().map(|v|(v*scale) as i32).unwrap_or(area.position.y+24);clamp_position(&window,x,y)?;}
            let toggle=MenuItem::with_id(app,"toggle","展开 / 收起 · Toggle",true,None::<&str>)?;let refresh=MenuItem::with_id(app,"refresh","刷新额度 · Refresh",true,None::<&str>)?;
            let pin_item=MenuItem::with_id(app,"pin","切换置顶 · Toggle pin",true,None::<&str>)?;let quit=MenuItem::with_id(app,"quit","退出 · Quit",true,None::<&str>)?;
            let menu=Menu::with_items(app,&[&toggle,&refresh,&pin_item,&quit])?;
            let bytes:&[u8]=if cfg!(target_os="macos"){include_bytes!("../icons/trayTemplate.png")}else{include_bytes!("../icons/tray-offline.png")};
            TrayIconBuilder::with_id("main-tray").icon(tauri::image::Image::from_bytes(bytes)?).icon_as_template(cfg!(target_os="macos")).tooltip("Codex Floating Ball").menu(&menu).show_menu_on_left_click(false)
                .on_menu_event(|app,event|tray_action(app,event.id.as_ref())).on_tray_icon_event(|tray,event|if matches!(event,TrayIconEvent::Click{button:MouseButton::Left,button_state:MouseButtonState::Up,..}){tray_action(tray.app_handle(),"toggle");}).build(app)?;
            let handle=app.handle().clone();tauri::async_runtime::spawn(async move{
                let mut last_day=reports::day_start(storage::now());let mut early_day=0;let mut last_tick=storage::now();let mut tick=0_u64;
                #[cfg(target_os="macos")] let mut last_reduced=reduced_transparency();
                loop{tokio::time::sleep(std::time::Duration::from_secs(1)).await;let state=handle.state::<State>();if state.quitting.load(Ordering::Relaxed){break;}
                    let now=storage::now();let day=reports::day_start(now);let early=now>=day+86400000-1000&&early_day!=day;
                    if (day!=last_day&&now>=day+1000)||early||now-last_tick>120000{let _=handle.emit("reports:due",());if early{early_day=day;}if now>=day+1000{last_day=day;}}last_tick=now;
                    if state.scanning.load(Ordering::Relaxed)&&now-state.scan_started.load(Ordering::Relaxed)>300000{state.scanning.store(false,Ordering::Relaxed);state.scan_failed.store(true,Ordering::Relaxed);let _=handle.emit("reports:updated",());}
                    if state.dirty.swap(false,Ordering::Relaxed){if let Ok(ui)=state.ui.lock(){let _=storage::write_json(&state.profile.join("settings.json"),&ui.settings);}}
                    tick+=1;if tick%2==0{if let Some(window)=handle.get_webview_window("main"){let _=off_taskbar(&window);}}
                    #[cfg(target_os="macos")] if tick%2==0&&last_reduced!=reduced_transparency(){
                        last_reduced=reduced_transparency();
                        if let Some(window)=handle.get_webview_window("main"){
                            let detail=state.ui.lock().map(|ui|ui.mode=="detail").unwrap_or(false);
                            apply_glass(&window,detail);if let Ok(value)=theme(&window,&state){let _=window.emit("theme:changed",value);}
                        }
                    }
                }
            });Ok(())
        })
        .invoke_handler(tauri::generate_handler![call])
        .on_window_event(|window,event|{
            let Some(state)=window.app_handle().try_state::<State>()else{return;};if state.quitting.load(Ordering::Relaxed){return;}
            let collapse=match event{tauri::WindowEvent::CloseRequested{api,..}=>{api.prevent_close();true},tauri::WindowEvent::Focused(false)=>!state.modal.load(Ordering::Relaxed),_=>false};
            if collapse{let close=matches!(event,tauri::WindowEvent::CloseRequested{..});let should={let ui=state.ui.lock().unwrap();ui.mode=="detail"&&(close||!(ui.view=="history"&&ui.history_pinned))};if should{let app=window.app_handle().clone();tauri::async_runtime::spawn(async move{if let Some(w)=app.get_webview_window("main"){let _=mode(&w,&app.state::<State>(),"compact",false);}});}}
            if let tauri::WindowEvent::Moved(position)=event{let scale=window.scale_factor().unwrap_or(1.0);if let Ok(mut ui)=state.ui.lock(){ui.settings["windowBounds"]=json!({"x":position.x as f64/scale,"y":position.y as f64/scale});state.dirty.store(true,Ordering::Relaxed);}}
            if let tauri::WindowEvent::ThemeChanged(_)=event{if let Some(w)=window.app_handle().get_webview_window("main"){if let Ok(value)=theme(&w,&state){let _=w.emit("theme:changed",value);}}}
        })
        .run(tauri::generate_context!()).expect("Cannot start Codex Floating Ball");
}

#[cfg(test)] mod update_tests {
    use super::*;
    #[test] fn release_validation() {
        let release=|tag,url|json!({"tag_name":tag,"html_url":url});
        assert_eq!(release_result(&release("v2.0.0","https://github.com/lambsusie/codex-floating-ball/releases/tag/v2.0.0")).unwrap()["updateAvailable"],true);
        assert_eq!(release_result(&release("v1.2.2","https://github.com/lambsusie/codex-floating-ball/releases/tag/v1.2.2")).unwrap()["updateAvailable"],false);
        assert!(release_result(&release("v2.0.0","https://example.com/releases/tag/v2.0.0")).is_err());
        assert!(release_result(&release("invalid","https://github.com/lambsusie/codex-floating-ball/releases/tag/v2.0.0")).is_err());
    }
}
