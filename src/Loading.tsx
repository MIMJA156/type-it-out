import { useEffect, useState } from "preact/hooks";

export default function Loading({
    text,
    frames,
    delay
}: {
    text: string;
    frames: string[];
    delay: number;
}) {
    const [counter, setCounter] = useState(0);

    useEffect(() => {
        let id = setInterval(() => {
            setCounter(v => v + 1);
        }, delay);

        return () => {
            clearInterval(id)
        };
    }, []);

    return (
        <div>
            <span class={"text-xl"}>
                {text}{frames[counter % frames.length]}
            </span>
        </div>
    );
}