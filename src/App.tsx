import { useEffect, useRef, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Loading from "./Loading";
import "./style.css";

function App() {
	const [contents, setContents] = useState("");

	const [ui, setUi] = useState<"idle" | "watching" | "typing" | "finished" | "aborted">("idle");
	const [progress, setProgress] = useState(0);

	const uiRef = useRef(ui);

	const hasContents = contents.length <= 0;
	const locked = ui === "typing" || ui === "watching";

	const handleTextareaChange = (event: InputEvent) => {
		if (!event.target) return;
		let target = event.target as HTMLTextAreaElement;

		setContents(target.value);
	};

	const startTyping = (str: string) => {
		setUi("watching");
		invoke("start_watcher", {
			toType: str
		});
	};

	const stopTyping = () => {
		setUi("aborted");
		invoke("abort_current");
	};

	useEffect(() => {
		uiRef.current = ui;
	}, [ui]);

	useEffect(() => {
		let unListenTypingProgress = listen("progress-typing", (event) => {
			let progress = event.payload as number;
			setProgress(progress);

			if (progress === 1) setUi("finished");
		});

		let unListenStartedTyping = listen("started-typing", () => setUi("typing"));
		let unListenTypingCancel = listen("cancel-key-pressed", () => {
			if (uiRef.current !== "idle" && uiRef.current !== "finished") {
				setUi("aborted");
			}
		});

		return () => {
			unListenStartedTyping.then(f => f());
			unListenTypingProgress.then(f => f());
			unListenTypingCancel.then(f => f());
		};
	}, []);

	return (
		<main class={"w-screen h-screen bg-stone-800 text-white/90 p-4 flex flex-col gap-8"}>
			<div class={"flex flex-col gap-2"}>
				<span class={"text-2xl"}>
					Type It Out!
				</span>
				<span class={"text-lg text-white/80"}>
					Type in the text box to get started.
				</span>
			</div>

			<textarea
				onInput={handleTextareaChange}
				class={"w-full h-28 min-h-28 max-h-56 border-2 not-disabled:border-stone-400 disabled:border-stone-700"}
				disabled={locked}
			/>

			<div class={"flex flex-col gap-3"}>
				<div class={"flex flex-row gap-4"}>
					<button
						class={"px-4 py-2 outline not-disabled:cursor-pointer bg-stone-700 not-disabled:hover:bg-stone-700/70 disabled:brightness-75"}
						disabled={hasContents || locked}
						onClick={() => startTyping(contents)}
					>
						Start Watching
					</button>
					<button
						class={"px-4 py-2 outline not-disabled:cursor-pointer bg-stone-700 not-disabled:hover:bg-stone-700/70 disabled:brightness-75"}
						disabled={hasContents || !locked}
						onClick={stopTyping}
					>
						Cancel
					</button>
				</div>

				{ui === "watching" &&
					<div class={"flex flex-col"}>
						<span>start key {"->"} Right Control</span>
						<Loading
							text="watching for start key"
							frames={[".", "..", "...", "....", "....."]}
							delay={250}
						/>
					</div>
				}

				{ui === "typing" &&
					<div class={"flex flex-col"}>
						<Loading
							text="Started! Typing given contents"
							frames={[".", "..", "...", "....", "....."]}
							delay={250}
						/>
						<span>progress:</span>
						<progress value={progress} class={"w-64"}></progress>
					</div>
				}

				{ui === "finished" &&
					<div class={"flex flex-col"}>
						<span class={"text-xl"}>Finished Typing!</span>
					</div>
				}

				{ui === "aborted" &&
					<div class={"flex flex-col"}>
						<span class={"text-xl"}>Typing Aborted!</span>
					</div>
				}
			</div>
		</main>
	);
}

export default App;