import { invoke } from "@tauri-apps/api/core";
import { useAppSettings, useAppState } from "../App";
import { useLocked } from "../useLocked";
import { useEffect, useRef, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";
import Loading from "../Loading";
import { openUrl } from "@tauri-apps/plugin-opener";

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

    return `${seconds} second${s(seconds)}`;
}

type TypingThreadProgress = {
    progress: number,
    timeLeft: number
};

function Home() {
    const upperDelayBound = useAppSettings((state) => state.upperDelayBound);
    const lowerDelayBound = useAppSettings((state) => state.lowerDelayBound);

    const textToType = useAppState((state) => state.textToType);
    const setTextToType = useAppState((state) => state.setTextToType);
    const stage = useAppState((state) => state.stage);
    const setStage = useAppState((state) => state.setStage);

    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const stageRef = useRef(stage);

    const hasContents = textToType.length <= 0;
    const locked = useLocked();

    const handleTextareaChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLTextAreaElement;
        setTextToType(target.value);
    };

    const startTyping = () => {
        setStage("watching");
        invoke("start_watcher", {
            toType: textToType,
            upperDelay: upperDelayBound,
            lowerDelay: lowerDelayBound
        });
    };

    const stopTyping = () => {
        setStage("cancelled");
        invoke("abort_current");
    };

    useEffect(() => {
        stageRef.current = stage;
    }, [stage]);

    useEffect(() => {
        let unListenTypingProgress = listen("progress-typing", (event) => {
            let packet = event.payload as TypingThreadProgress;

            setProgress(packet.progress);
            setTimeLeft(packet.timeLeft);

            if (packet.progress === 1) setStage("finished");
        });

        let unListenStartedTyping = listen("started-typing", () => setStage("typing"));
        let unListenTypingCancel = listen("cancel-key-pressed", () => {
            if (stageRef.current !== "idle" && stageRef.current !== "finished") {
                setStage("cancelled");
            }
        });

        return () => {
            unListenStartedTyping.then(f => f());
            unListenTypingProgress.then(f => f());
            unListenTypingCancel.then(f => f());
        };
    }, []);

    return (
        <div class={"flex flex-col justify-between gap-4 p-4 h-full"}>
            <div class={"flex flex-col"}>
                <span class={"text-4xl"}>Type It Out</span>
                <span class={"text-white/70"}>Developed by: mimja</span>
                <span class={"text-white/70"}>
                    <span>Enjoying Type It Out? Consider giving it a </span>
                    <a class={"underline text-blue-400 cursor-pointer"} onClick={() => openUrl("https://github.com/mimja156/type-it-out")}>star on github</a>!
                </span>
            </div>
            <div class={"flex flex-col gap-2"}>
                <div class={"bg-neutral-800 border border-neutral-700 rounded"}>
                    <textarea
                        placeholder={"paste some text..."}
                        onInput={handleTextareaChange}
                        value={textToType}
                        class={"w-full h-42 outline-none resize-none p-1"}
                        disabled={locked}
                    />
                </div>

                <div class={"flex flex-row gap-2"}>
                    <button
                        class={"px-4 py-2 border border-stone-400 not-disabled:cursor-pointer bg-stone-700 not-disabled:hover:bg-stone-700/70 disabled:brightness-75 rounded"}
                        disabled={hasContents || locked}
                        onClick={startTyping}
                    >
                        Start Watching
                    </button>
                    <button
                        class={"px-4 py-2 border border-stone-400 not-disabled:cursor-pointer bg-stone-700 not-disabled:hover:bg-stone-700/70 disabled:brightness-75 rounded"}
                        disabled={hasContents || !locked}
                        onClick={stopTyping}
                    >
                        Cancel
                    </button>

                    <div class={"flex items-end ml-2"}>
                        {stage === "watching" &&
                            <Loading
                                text="watching for start key (right control)"
                                frames={[".", "..", "...", "....", "....."]}
                                delay={250}
                            />
                        }

                        {stage === "typing" &&
                            <div class={"flex flex-col"}>
                                <div class={"flex items-center gap-2"}>
                                    <progress value={progress} class={"w-64"} />
                                    <span class={"text-sm"}>{Math.round(progress * 100)}%</span>
                                </div>
                                <span class={"text-sm"}>time left: {format(timeLeft)}</span>
                            </div>
                        }

                        {stage === "finished" && <span>finished typing</span>}
                        {stage === "cancelled" && <span>typing aborted</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Home;