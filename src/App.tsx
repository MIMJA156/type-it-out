import { LucideCircleQuestionMark, LucideHome, LucideSettings } from "lucide-preact";
import { useState } from "preact/hooks";
import { create } from "zustand";

import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Home from "./pages/Home";
import { useLocked } from "./useLocked";

interface AppSettingsStore {
	upperDelayBound: number,
	lowerDelayBound: number,

	setUpperDelayBound: (upper: number) => void,
	setLowerDelayBound: (lower: number) => void
};

export const useAppSettings = create<AppSettingsStore>((set) => ({
	upperDelayBound: 100,
	lowerDelayBound: 50,

	setUpperDelayBound: (upper) => set(() => ({ upperDelayBound: upper })),
	setLowerDelayBound: (lower) => set(() => ({ lowerDelayBound: lower }))
}));

type Stages = "idle" | "watching" | "typing" | "finished" | "cancelled";
interface AppStateStore {
	textToType: string,
	stage: Stages,

	setTextToType: (textToType: string) => void,
	setStage: (stage: Stages) => void
};

export const useAppState = create<AppStateStore>((set) => ({
	textToType: "",
	stage: "idle",

	setTextToType: (textToType) => set(() => ({ textToType })),
	setStage: (stage) => set(() => ({ stage }))
}));

function App() {
	const [ui, setUi] = useState<"home" | "settings" | "help">("home");
	const locked = useLocked();

	return (
		<div class={"grid grid-cols-[70px_auto] h-full w-full bg-neutral-900 bg-[url(carbon.png)] bg-size-[55px] bg-blend-darken"}>
			<div class={"bg-neutral-800 border-r border-neutral-700 flex flex-col items-center gap-6 pt-6"}>
				<button onClick={() => setUi("home")} disabled={locked} >
					<LucideHome
						size={"36px"}
						class={`${ui === "home" ? "stroke-zinc-200" : "stroke-zinc-400"} cursor-pointer`}
					/>
				</button>

				<button onClick={() => setUi("settings")} disabled={locked} >
					<LucideSettings
						size={"36px"}
						class={`${ui === "settings" ? "stroke-zinc-200" : "stroke-zinc-400"} cursor-pointer`}
					/>
				</button>

				{/* <button onClick={() => setUi("help")} disabled={locked} >
					<LucideCircleQuestionMark
						size={"36px"}
						class={`${ui === "help" ? "stroke-zinc-200" : "stroke-zinc-400"} cursor-pointer`}
					/>
				</button> */}
			</div>
			<div>
				{ui === "home" && <Home />}
				{ui === "settings" && <Settings />}
				{ui === "help" && <Help />}
			</div>
		</div>
	);
}

export default App;