/**
 * Blocking theme script for <head> — avoids React 19 client-component script errors.
 * Must stay in sync with ThemeProvider storage key and class strategy.
 */
export function themeInitScriptContent() {
  return `(function(){try{var k='theme',t=localStorage.getItem(k)||'system',d=document.documentElement,r=t==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;d.classList.remove('light','dark');d.classList.add(r);d.style.colorScheme=r==='dark'?'dark':'light'}catch(e){}})();`;
}
