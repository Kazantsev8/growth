export const THEME_KEY = "growth.theme";

// ——— тема ———
export function loadTheme(){
  let t; try{ t = localStorage.getItem(THEME_KEY); }catch(e){}
  if(!t) t = (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  return t;
}
export function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  document.querySelector('meta[name=theme-color]').setAttribute("content", t==="dark" ? "#0c0a11" : "#e7e3d8");
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
}
export function curTheme(){ return document.documentElement.getAttribute("data-theme"); }
export function toggleTheme(){
  applyTheme(curTheme()==="dark" ? "light" : "dark");
  const b = document.getElementById("themeBtn"); if(b) b.textContent = curTheme()==="dark" ? "LIGHT" : "DARK";
}
