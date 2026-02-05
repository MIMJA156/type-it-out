import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "preact/hooks";
import { Loader2 } from "lucide-preact";
import TypeItOut from "./TypeItOut";
import Loading from "./Loading";
import "./style.css";

function App() {
	const [ui, setUi] = useState<"checking" | "updating" | "completed">("checking");

	const update = async () => {
		const update = await check();
		if (update) {
			console.log(`found update ${update.version} from ${update.date} with notes ${update.body}`);
			setUi("updating");

			let downloaded = 0;
			let contentLength = 0;

			await update.downloadAndInstall((event) => {
				switch (event.event) {
					case "Started":
						contentLength = event.data.contentLength ?? 0;
						console.log(`started downloading ${event.data.contentLength} bytes`);
						break;

					case "Progress":
						downloaded += event.data.chunkLength;
						console.log(`downloaded ${downloaded} from ${contentLength}`);
						break;

					case "Finished":
						console.log("download finished");
						break;
				}
			});
		} else {
			setUi("completed");
		}
	};

	useEffect(() => {
		update().catch(() => {
			setUi("completed");
		});
	}, []);

	return (
		<main class={"w-screen h-screen bg-neutral-900 text-white/90 bg-[url(carbon.png)] bg-size-[55px] bg-blend-darken"}>
			{ui === "completed" && <TypeItOut />}
			{ui === "checking" &&
				<div class="h-full flex flex-col justify-center items-center">
					<Loader2 class={"animate-spin"} size={32} />
					<span>checking for updates</span>
				</div>
			}
			{ui === "updating" &&
				<div class="h-full flex flex-col justify-center items-center">
					<Loading
						text="update found! updating app to latest version"
						frames={[".", "..", "...", "....", "....."]}
						delay={250}
					/>
				</div>
			}
		</main>
	);
}

export default App;