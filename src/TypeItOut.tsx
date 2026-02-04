import { useEffect, useRef, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import Loading from "./Loading";

function s(time: number) {
    return time !== 1 ? "s" : ""
}

function format(ms: number) {
    if (ms < 1000) return "less then a second";

    let seconds = Math.floor(ms / 1000);
    if (seconds > 60) {
        let minutes = Math.floor(seconds / 60);
        let remainingSeconds = (seconds - minutes * 60);

        if (minutes > 60) return "over an hour";

        return `${minutes} minute${s(minutes)} and ${remainingSeconds} second${s(remainingSeconds)}`;
    }

    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}

type TypingThreadProgress = {
    progress: number,
    timeLeft: number
};

function TypeItOut() {
    const [contents, setContents] = useState("");

    const [ui, setUi] = useState<"idle" | "watching" | "typing" | "finished" | "aborted">("idle");
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    const [lowerTypingDelay, setLowerTypingDelay] = useState(20);
    const [upperTypingDelay, setUpperTypingDelay] = useState(40);

    const uiRef = useRef(ui);

    const hasContents = contents.length <= 0;
    const locked = ui === "typing" || ui === "watching";

    const handleTextareaChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLTextAreaElement;
        setContents(target.value);
    };

    const handleLowerTypingDelayChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLInputElement;
        setLowerTypingDelay(Number(target.value));
    };

    const handleUpperTypingDelayChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLInputElement;
        setUpperTypingDelay(Number(target.value));
    };

    const startTyping = () => {
        setUi("watching");
        invoke("start_watcher", {
            toType: contents,
            lowerDelay: lowerTypingDelay,
            upperDelay: upperTypingDelay
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
            let packet = event.payload as TypingThreadProgress;

            setProgress(packet.progress);
            setTimeLeft(packet.timeLeft);

            if (packet.progress === 1) setUi("finished");
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
        <div class={"flex flex-col gap-8 p-4"}>
            <div class={"flex flex-col gap-2"}>
                <span class={"text-2xl"}>
                    Type It Out!
                </span>
                <span class={"text-lg text-white/80"}>
                    Type in the text box to get started.
                </span>
            </div>

            <div class={"flex flex-col gap-2"}>
                <span class={"text-lg"}>typing delay range:</span>
                <div class={"flex gap-2"}>
                    <div class={"flex flex-col"}>
                        <label for="lower">lower (ms)</label>
                        <input id="lower" type="number" class={"border-2 not-disabled:border-stone-400 disabled:border-stone-700"} onInput={handleLowerTypingDelayChange} value={lowerTypingDelay} disabled={locked} />
                    </div>
                    <div class={"flex flex-col"}>
                        <label for="upper">upper (ms)</label>
                        <input id="upper" type="number" class={"border-2 not-disabled:border-stone-400 disabled:border-stone-700"} onInput={handleUpperTypingDelayChange} value={upperTypingDelay} disabled={locked} />
                    </div>
                </div>
            </div>

            <textarea
                onInput={handleTextareaChange}
                value={contents}
                class={"w-full h-28 min-h-28 max-h-56 border-2 not-disabled:border-stone-400 disabled:border-stone-700"}
                disabled={locked}
            />

            <div class={"flex flex-col gap-3"}>
                <div class={"flex flex-row gap-4"}>
                    <button
                        class={"px-4 py-2 outline not-disabled:cursor-pointer bg-stone-700 not-disabled:hover:bg-stone-700/70 disabled:brightness-75"}
                        disabled={hasContents || locked}
                        onClick={startTyping}
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
                        <span>time left: {format(timeLeft)}</span>
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
        </div>
    );
}

export default TypeItOut;