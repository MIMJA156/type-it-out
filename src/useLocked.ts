import { useAppState } from "./App";

export function useLocked() {
    const stage = useAppState((state) => state.stage);
    return stage === "typing" || stage === "watching"
}