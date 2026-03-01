/**
 * Explora theme: light/dark mode via CSS variables.
 * Persists choice in localStorage (key: explora_theme).
 */

const STORAGE_KEY = "explora_theme";

export function getTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch (_) {}
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme) {
  if (theme !== "dark" && theme !== "light") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (_) {}
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function applyTheme(theme) {
  const doc = document.documentElement;
  doc.setAttribute("data-theme", theme);
  doc.classList.remove("theme-light", "theme-dark");
  doc.classList.add("theme-" + theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
