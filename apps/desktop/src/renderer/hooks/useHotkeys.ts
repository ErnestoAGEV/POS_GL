import { useEffect } from "react";

type HotkeyMap = Record<string, () => void>;

export function useHotkeys(hotkeys: HotkeyMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const key = e.key;
      if (hotkeys[key]) {
        e.preventDefault();
        hotkeys[key]();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hotkeys]);
}
