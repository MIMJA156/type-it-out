use std::{collections::VecDeque, sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}, mpsc::{self, Receiver, Sender}}, thread, time::Duration};
use tauri::{Emitter, Listener, Manager, State};
use enigo::{Enigo, Keyboard, Settings};
use rdev::listen;

struct AppData {
    watching_for_activation_key: bool,
    string_to_type: Option<String>,
    stop_typing_flag: Arc<AtomicBool>
}

#[tauri::command]
fn start_watcher(state: State<'_, Mutex<AppData>>, to_type: String) {
    let mut state = state.lock().unwrap();
    state.stop_typing_flag.store(false, Ordering::Relaxed);
    state.string_to_type = Some(to_type);
    state.watching_for_activation_key = true;
}

#[tauri::command]
fn abort_current(state: State<'_, Mutex<AppData>>) {
    let mut state = state.lock().unwrap();
    state.stop_typing_flag.store(true, Ordering::Relaxed);
    state.watching_for_activation_key = false;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (string_sender, string_receiver): (Sender<String>, Receiver<String>) = mpsc::channel();
    let stop_typing_flag = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .manage(Mutex::new(
            AppData {
                watching_for_activation_key: false,
                string_to_type: None,
                stop_typing_flag: stop_typing_flag.clone()
            }
        ))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_watcher, abort_current])
        .setup(|app| {
            let handle = app.handle();

            let keyboard_watcher_handle = handle.clone();
            thread::spawn(move || {
                if let Err(error) = listen(move |event| {
                    match event.event_type {
                        rdev::EventType::KeyRelease(rdev::Key::ControlRight) => {
                            _ = keyboard_watcher_handle.emit("start-key-pressed", ());
                        },
                        rdev::EventType::KeyRelease(rdev::Key::Escape) => {
                            _ = keyboard_watcher_handle.emit("cancel-key-pressed", ());
                        },
                        _ => {}
                    }
                }) {
                    println!("Error: {:?}", error);
                }
            });

            let keyboard_emulator_handle = handle.clone();
            thread::spawn(move || {
                let mut enigo = Enigo::new(&Settings::default()).unwrap();

                loop {
                    let str = string_receiver.recv();
                    if let Ok(str) = str {
                        thread::sleep(Duration::from_millis(20));

                        let mut queue = VecDeque::new();
                        for char in str.chars() {
                            queue.push_back(char);
                        }

                        let total = queue.len();

                        'inner: while !queue.is_empty() {
                            if stop_typing_flag.load(Ordering::Relaxed) {
                                break 'inner;
                            }
                            
                            let char = queue.pop_front();
                            if let Some(char) = char {
                                _ = enigo.text(&char.to_string());
                                thread::sleep(Duration::from_millis(20));
                            }

                            _ = keyboard_emulator_handle.emit("progress-typing", 1.0 - (queue.len() as f32 / total as f32));
                        }

                        stop_typing_flag.store(false, Ordering::Relaxed);
                    }
                }
            });

            let start_listen_handler = handle.clone();
            handle.listen("start-key-pressed", move |_event| {
                let state = start_listen_handler.state::<Mutex<AppData>>();
                let mut state = state.lock().unwrap();

                if state.watching_for_activation_key {
                    state.watching_for_activation_key = false;
                    start_listen_handler.emit("started-typing", ()).unwrap();

                    if let Some(str) = &state.string_to_type {
                        _ = string_sender.send(str.clone());
                    }
                }
            });

            let cancel_listen_handler = handle.clone();
            handle.listen("cancel-key-pressed", move |_event| {
                let state = cancel_listen_handler.state::<Mutex<AppData>>();
                let mut state = state.lock().unwrap();

                state.stop_typing_flag.store(true, Ordering::Relaxed);
                state.watching_for_activation_key = false;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}