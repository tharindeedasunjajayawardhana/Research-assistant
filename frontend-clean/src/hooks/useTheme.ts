import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
const KEY = "theme";

function apply(pref: ThemePreference) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = localStorage.getItem(KEY) as ThemePreference | null;
    if (stored === "light" || stored === "dark" || stored === "system") setThemeState(stored);
  }, []);

  useEffect(() => {
    apply(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((t: ThemePreference) => {
    localStorage.setItem(KEY, t);
    setThemeState(t);
  }, []);

  return { theme, setTheme };
}

/** Inline script run before paint to avoid a theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;
