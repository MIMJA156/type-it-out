import { event } from "@tauri-apps/api";
import { useAppSettings } from "../App";

function Settings() {
    const upperDelayBound = useAppSettings((state) => state.upperDelayBound);
    const lowerDelayBound = useAppSettings((state) => state.lowerDelayBound);
    const deleteTextAfterCompletion = useAppSettings((state) => state.deleteTextAfterCompletion);

    const setUpperDelayBound = useAppSettings((state) => state.setUpperDelayBound);
    const setLowerDelayBound = useAppSettings((state) => state.setLowerDelayBound);
    const setDeleteTextAfterCompletion = useAppSettings((state) => state.setDeleteTextAfterCompletion);

    const handleUpperTypingDelayChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLInputElement;
        setUpperDelayBound(Number(target.value));
    };

    const handleLowerTypingDelayChange = (event: InputEvent) => {
        if (!event.target) return;
        let target = event.target as HTMLInputElement;
        setLowerDelayBound(Number(target.value));
    };

    const handleDeleteTextAfterCompletionChange = () => {
        setDeleteTextAfterCompletion(!deleteTextAfterCompletion);
    };

    return (
        <div class={"p-4 flex flex-col gap-4"}>
            <span class={"text-2xl"}>Settings</span>

            <div class={"flex flex-col gap-2 bg-neutral-800 p-2 rounded w-min border border-neutral-700"}>
                <span class={"text-lg"}>typing delay range:</span>
                <div class={"flex gap-2"}>
                    <div class={"flex flex-col"}>
                        <label for="lower">lower (ms)</label>
                        <input
                            id="lower"
                            type="number"
                            class={"border-2 border-stone-500 rounded outline-none p-1"}
                            value={lowerDelayBound}
                            onInput={handleLowerTypingDelayChange}
                        />
                    </div>
                    <div class={"flex flex-col"}>
                        <label for="upper">upper (ms)</label>
                        <input
                            id="upper"
                            type="number"
                            class={"border-2 border-stone-500 rounded outline-none p-1"}
                            value={upperDelayBound}
                            onInput={handleUpperTypingDelayChange}
                        />
                    </div>
                </div>
            </div>
            <div class={"flex flex-row gap-3 items-center bg-neutral-800 p-2 rounded w-min border border-neutral-700"}>
                <label for="delete-after" class={"text-lg whitespace-nowrap"}>delete text after typing:</label>
                <div class={"flex flex-row gap-2 items-center"}>
                    <input
                        class={"w-5 h-5 cursor-pointer"}
                        id="delete-after"
                        type="checkbox"
                        checked={deleteTextAfterCompletion}
                        onInput={handleDeleteTextAfterCompletionChange}
                    />
                    {deleteTextAfterCompletion ? "Yes" : "No"}
                </div>
            </div>
        </div>
    )
}

export default Settings;