import { LucideHome, LucideSettings } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { getVersion } from "@tauri-apps/api/app";
import { persist } from "zustand/middleware";
import { create } from "zustand";

import { useLocked } from "./useLocked";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Home from "./pages/Home";

interface AppSettingsStore {
	upperDelayBound: number,
	lowerDelayBound: number,
	deleteTextAfterCompletion: boolean

	setUpperDelayBound: (upper: number) => void,
	setLowerDelayBound: (lower: number) => void,
	setDeleteTextAfterCompletion: (choice: boolean) => void,
};

export const useAppSettings = create<AppSettingsStore>()(
	persist(
		(set) => ({
			upperDelayBound: 100,
			lowerDelayBound: 50,
			deleteTextAfterCompletion: false,

			setUpperDelayBound: (upper) => set(() => ({ upperDelayBound: upper })),
			setLowerDelayBound: (lower) => set(() => ({ lowerDelayBound: lower })),
			setDeleteTextAfterCompletion: (choice) => set(() => ({ deleteTextAfterCompletion: choice })),
		}),
		{ name: "app-settings", version: 1 }
	)
);

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
	const [version, setVersion] = useState("0.0.0");
	const [ui, setUi] = useState<"home" | "settings" | "help">("home");
	const locked = useLocked();

	useEffect(() => {
		getVersion().then(v => setVersion(v));
	}, []);

	return (
		<div class={"grid grid-cols-[70px_auto] h-full w-full bg-neutral-900 bg-[url(carbon.png)] bg-size-[55px] bg-blend-darken"}>
			<div class={"bg-neutral-800 border-r border-neutral-700 flex flex-col justify-between items-center"}>
				<div class={"flex flex-col gap-6 pt-6"}>
					<button
						onClick={() => setUi("home")}
						disabled={locked}
						class={"not-disabled:cursor-pointer"}
					>
						<LucideHome
							size={"36px"}
							class={ui === "home" ? `${locked ? "stroke-zinc-600" : "stroke-zinc-200"}` : `stroke-zinc-400`}
						/>
					</button>

					<button
						onClick={() => setUi("settings")}
						disabled={locked}
						class={"not-disabled:cursor-pointer"}
					>
						<LucideSettings
							size={"36px"}
							class={ui === "settings" ? "stroke-zinc-200" : `${locked ? "stroke-zinc-600" : "stroke-zinc-400"}`}
						/>
					</button>

					{/* <button onClick={() => setUi("help")} disabled={locked} >
						<LucideCircleQuestionMark
							size={"36px"}
							class={`${ui === "help" ? "stroke-zinc-200" : "stroke-zinc-400"} cursor-pointer`}
						/>
					</button> */}
				</div>
				<span class={"mb-2"}>v{version}</span>
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