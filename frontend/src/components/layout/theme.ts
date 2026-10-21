// Theme state lives on <html data-theme>. No attribute => follow the OS.
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "fourthdown-theme";

// Runs before paint (inlined in <head>) so there is no flash of the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})();`;
