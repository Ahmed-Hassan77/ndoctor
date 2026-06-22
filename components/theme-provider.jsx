"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext(undefined);

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function resolveTheme(theme, enableSystem) {
  if (theme === "system" && enableSystem) return getSystemTheme();
  return theme === "dark" ? "dark" : "light";
}

function applyTheme(resolved, { attribute = "class", enableColorScheme = true }) {
  const root = document.documentElement;
  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  } else {
    root.setAttribute(attribute, resolved);
  }
  if (enableColorScheme) {
    root.style.colorScheme = resolved === "dark" ? "dark" : "light";
  }
}

/**
 * Theme provider without inline <script> (React 19 safe).
 * Pair with themeInitScriptContent() in the root layout <head>.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  enableColorScheme = true,
  disableTransitionOnChange = false,
  storageKey = STORAGE_KEY,
}) {
  const [theme, setThemeState] = useState(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState("light");

  useEffect(() => {
    let stored = defaultTheme;
    try {
      stored = localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      /* ignore */
    }
    setThemeState(stored);
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    const resolved = resolveTheme(theme, enableSystem);
    setResolvedTheme(resolved);

    let restoreTransitions;
    if (disableTransitionOnChange) {
      const style = document.createElement("style");
      style.textContent =
        "*,*::before,*::after{transition:none!important}";
      document.head.appendChild(style);
      restoreTransitions = () => {
        window.getComputedStyle(document.body);
        setTimeout(() => document.head.removeChild(style), 1);
      };
    }

    applyTheme(resolved, { attribute, enableColorScheme });
    restoreTransitions?.();
  }, [theme, attribute, enableSystem, enableColorScheme, disableTransitionOnChange]);

  useEffect(() => {
    if (!enableSystem) return undefined;
    const mq = window.matchMedia(MEDIA_QUERY);
    const onChange = () => {
      if (theme !== "system") return;
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved, { attribute, enableColorScheme });
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, attribute, enableSystem, enableColorScheme]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== storageKey) return;
      setThemeState(event.newValue || defaultTheme);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [defaultTheme, storageKey]);

  const setTheme = useCallback(
    (value) => {
      const next = typeof value === "function" ? value(theme) : value;
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* ignore */
      }
    },
    [theme, storageKey]
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      forcedTheme: undefined,
      systemTheme: enableSystem ? getSystemTheme() : undefined,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [theme, setTheme, resolvedTheme, enableSystem]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Drop-in replacement for `useTheme` from next-themes. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system",
      setTheme: () => {},
      resolvedTheme: "light",
      forcedTheme: undefined,
      systemTheme: "light",
      themes: ["light", "dark", "system"],
    };
  }
  return ctx;
}
