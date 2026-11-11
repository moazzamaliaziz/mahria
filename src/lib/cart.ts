import type { CartLine } from "./types";

const key = "mehria-bag-v1";
const empty: CartLine[] = [];
let snapshot: CartLine[] = empty;
let initialized = false;
const listeners = new Set<() => void>();

export function parseCart(value: string | null): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    let total = 0;
    return parsed
      .filter((line): line is CartLine => {
        if (
          !line ||
          typeof line.itemId !== "string" ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 20 ||
          ids.has(line.itemId) ||
          total + line.quantity > 50
        )
          return false;
        ids.add(line.itemId);
        total += line.quantity;
        return true;
      })
      .map(({ itemId, quantity }) => ({ itemId, quantity }));
  } catch {
    return [];
  }
}

export function getCartSnapshot() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try {
      snapshot = parseCart(localStorage.getItem(key));
    } catch {
      snapshot = [];
    }
  }
  return snapshot;
}

export function getServerCartSnapshot() {
  return empty;
}

export function saveCart(lines: CartLine[]) {
  snapshot = lines;
  initialized = true;
  try {
    localStorage.setItem(key, JSON.stringify(lines));
  } catch {
    /* The bag still works when storage is unavailable. */
  }
  listeners.forEach((listener) => listener());
}

export function subscribeCart(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      snapshot = parseCart(event.newValue);
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
