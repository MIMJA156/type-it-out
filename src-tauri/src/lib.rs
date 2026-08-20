use enigo::{Enigo, Keyboard, Settings};
use rand::Rng;
use rdev::listen;
use serde::Serialize;
use std::{
    collections::VecDeque,
    println,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Receiver, Sender},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{Emitter, Listener, Manager, State};

struct TypingThreadPacket {
    target: String,
    upper: u64,
    lower: u64,
    imitate_human_hesitation: bool,
}

struct TypingThreadChar {
    char: char,
    wait: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TypingThreadProgress {
    progress: f32,
    time_left: u32,
}

struct AppData {
    watching_for_activation_key: bool,
    stop_typing_flag: Arc<AtomicBool>,

    string_to_type: Option<String>,

    character_delay_range: Option<(u64, u64)>,
    imitate_human_hesitation: Option<bool>,
}

const HUMAN_HESITATION_PERCENT_ADDITION: u64 = 25; // represents a percentage. IE: 0 to 100

#[tauri::command]
fn start_watcher(
    state: State<'_, Mutex<AppData>>,
    to_type: String,
    lower_delay: u64,
    upper_delay: u64,
    imitate_human_hesitation: bool,
) {
    let mut state = state.lock().unwrap();
    state.stop_typing_flag.store(false, Ordering::Relaxed);
    state.string_to_type = Some(to_type);
    state.character_delay_range = Some((lower_delay, upper_delay));
    state.watching_for_activation_key = true;
    state.imitate_human_hesitation = Some(imitate_human_hesitation);
}

#[tauri::command]
fn abort_current(state: State<'_, Mutex<AppData>>) {
    let mut state = state.lock().unwrap();
    state.stop_typing_flag.store(true, Ordering::Relaxed);
    state.watching_for_activation_key = false;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (typing_packet_sender, typing_packet_receiver): (
        Sender<TypingThreadPacket>,
        Receiver<TypingThreadPacket>,
    ) = mpsc::channel();
    let stop_typing_flag = Arc::new(AtomicBool::new(false));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppData {
            watching_for_activation_key: false,
            stop_typing_flag: stop_typing_flag.clone(),
            string_to_type: None,
            character_delay_range: None,
            imitate_human_hesitation: None,
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_watcher, abort_current])
        .setup(|app| {
            let handle = app.handle();

            let keyboard_watcher_handle = handle.clone();
            thread::spawn(move || {
                if let Err(error) = listen(move |event| match event.event_type {
                    rdev::EventType::KeyRelease(rdev::Key::ControlRight) => {
                        _ = keyboard_watcher_handle.emit("start-key-pressed", ());
                    }
                    rdev::EventType::KeyRelease(rdev::Key::Escape) => {
                        _ = keyboard_watcher_handle.emit("cancel-key-pressed", ());
                    }
                    _ => {}
                }) {
                    println!("Error: {:?}", error);
                }
            });

            let keyboard_emulator_handle = handle.clone();
            thread::spawn(move || {
                let mut enigo = Enigo::new(&Settings::default()).unwrap();

                loop {
                    let packet: Result<TypingThreadPacket, mpsc::RecvError> =
                        typing_packet_receiver.recv();

                    if let Ok(packet) = packet {
                        thread::sleep(Duration::from_millis(20));
                        let mut rng = rand::rng();

                        let mut total_size = 0;
                        let mut total_time = 0;
                        let mut time_passed = 0;

                        let chars: Vec<char> = packet.target.chars().collect();
                        let mut queue: VecDeque<TypingThreadChar> = VecDeque::new();

                        for (i, char) in packet.target.chars().enumerate() {
                            let mut wait = rng.random_range(packet.lower..(packet.upper + 1));

                            if packet.imitate_human_hesitation && i > 0 && i < usize::MAX {
                                if chars.get(i - 1).is_some_and(|c| c.is_alphanumeric())
                                    && chars.get(i + 1).is_some_and(|c| c.is_alphanumeric())
                                {
                                    wait += (wait / 100) * HUMAN_HESITATION_PERCENT_ADDITION;
                                }
                            }

                            total_time += wait;
                            total_size += 1;
                            queue.push_back(TypingThreadChar { char, wait });
                        }

                        _ = keyboard_emulator_handle.emit(
                            "progress-typing",
                            TypingThreadProgress {
                                progress: 0.0,
                                time_left: total_time as u32,
                            },
                        );

                        'inner: while !queue.is_empty() {
                            if stop_typing_flag.load(Ordering::Relaxed) {
                                break 'inner;
                            }

                            let char = queue.pop_front();
                            if let Some(char) = char {
                                _ = enigo.text(&char.char.to_string());
                                thread::sleep(Duration::from_millis(char.wait));
                                time_passed += char.wait;
                            }

                            _ = keyboard_emulator_handle.emit(
                                "progress-typing",
                                TypingThreadProgress {
                                    progress: 1.0 - (queue.len() as f32 / total_size as f32),
                                    time_left: (total_time - time_passed) as u32,
                                },
                            );
                        }

                        _ = keyboard_emulator_handle.emit(
                            "progress-typing",
                            TypingThreadProgress {
                                progress: 1.0,
                                time_left: 0,
                            },
                        );

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

                    if let (Some(str), Some(range), Some(imitate_human_hesitation)) = (
                        &state.string_to_type,
                        &state.character_delay_range,
                        state.imitate_human_hesitation,
                    ) {
                        _ = typing_packet_sender.send(TypingThreadPacket {
                            target: str.clone(),
                            lower: range.0,
                            upper: range.1,
                            imitate_human_hesitation,
                        });
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
