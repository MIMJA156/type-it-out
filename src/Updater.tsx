import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "preact/hooks";
import { Loader2 } from "lucide-preact";
import Loading from "./Loading";
import "./style.css";
import App from "./App";

function Updater() {
    const [ui, setUi] = useState<"checking" | "updating" | "completed">("checking");

    const update = async () => {
        const update = await check();
        if (update) {
            setUi("updating");

            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength ?? 0;
                        break;

                    case "Progress":
                        downloaded += event.data.chunkLength;
                        break;

                    case "Finished":
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
        <main class={"w-screen h-screen bg-neutral-900 text-white/80"}>
            {ui === "completed" && <App />}

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

export default Updater;