import { useEffect, useState } from "react";

export type Language = "system" | "zh-HANS" | "en-US";
const KEY = "placemaker.language.v1";
const valid = (value: unknown): value is Language => value === "system" || value === "zh-HANS" || value === "en-US";
let current: Language = "system";
try {
    const saved = window.localStorage?.getItem(KEY);
    if (valid(saved)) current = saved;
} catch { /* Storage may be unavailable in the game browser. */ }
const listeners = new Set<(value: Language) => void>();
export function setLanguage(value: string) {
    if (!valid(value)) return;
    current = value;
    try { window.localStorage?.setItem(KEY, value); } catch { /* Keep the session choice. */ }
    listeners.forEach(listener => listener(value));
}
export function useLanguage(): Language {
    const [value, update] = useState(current);
    useEffect(() => {
        listeners.add(update);
        update(current);
        return () => { listeners.delete(update); };
    }, []);
    return value;
}
