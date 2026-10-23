// Browser stand-in for cs2/api: value bindings backed by an in-memory store the mock backend writes
// to, and triggers routed to the mock backend — the same surface the game exposes.
import { useMemo, useSyncExternalStore } from "react";
import { useLanguage } from "../../src/lib/language";
import assetNames from "../asset-names.zh-HANS.json";

type Listener = () => void;
const values = new Map<string, unknown>();
const listeners = new Set<Listener>();
type Handler = (group: string, name: string, args: unknown[]) => void;
let handler: Handler = () => undefined;
export const triggerLog: { group: string; name: string; args: unknown[] }[] = [];

export function setTriggerHandler(h: Handler) {
    handler = h;
}

export function publish(group: string, name: string, value: unknown) {
    values.set(`${group}.${name}`, value);
    listeners.forEach((l) => l());
}

export function peek(group: string, name: string) {
    return values.get(`${group}.${name}`);
}

export interface ValueBinding<T> {
    readonly value: T;
    subscribe(listener?: (v: T) => void): { value: T; setChangeListener(l: (v: T) => void): void; dispose(): void };
    dispose(): void;
    __key?: string;
    __fallback?: T;
}

export function bindValue<T>(group: string, name: string, fallbackValue?: T): ValueBinding<T> {
    const key = `${group}.${name}`;
    return {
        __key: key,
        __fallback: fallbackValue,
        get value() {
            return (values.has(key) ? values.get(key) : fallbackValue) as T;
        },
        subscribe: () => ({ value: values.get(key) as T, setChangeListener: () => undefined, dispose: () => undefined }),
        dispose: () => undefined,
    };
}

export function useValue<T>(binding: ValueBinding<T>): T {
    const language = useLanguage();
    const raw = useSyncExternalStore(
        (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        () => binding.value,
    );
    // The game supplies localized asset names. The mock has English fixtures,
    // so emulate that display layer without changing IDs or the backend data.
    return useMemo(() => {
        if (binding.__key !== "Placemaker.assets" || language !== "zh-HANS" || !raw) return raw;
        const lists = typeof raw === "string" ? JSON.parse(raw) : raw;
        const names = assetNames as Record<string, string>;
        const localized = Object.fromEntries(Object.entries(lists).map(([category, items]) => [
            category, (items as { name: string }[]).map(item => ({ ...item, name: names[item.name] ?? item.name })),
        ]));
        return (typeof raw === "string" ? JSON.stringify(localized) : localized) as T;
    }, [raw, language, binding.__key]);
}

export function trigger(group: string, name: string, ...args: unknown[]) {
    triggerLog.push({ group, name, args });
    if (triggerLog.length > 500) triggerLog.shift();
    handler(group, name, args);
}

export function bindTrigger(group: string, name: string) {
    return () => trigger(group, name);
}

export function bindTriggerWithArgs(group: string, name: string) {
    return (...args: unknown[]) => trigger(group, name, ...args);
}

export function call<T>(_group: string, _name: string): Promise<T> {
    return Promise.reject(new Error("call() is not mocked"));
}
