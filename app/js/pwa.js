import { state } from "./core/state.js";
import { appRefresh } from "./app.js";

export function initPwa(){
  // service worker registration
  if("serviceWorker" in navigator){ window.addEventListener("load",function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); }); }

  // кнопка «наверх»: видна, когда страница прокручена не от самого верха
  (function(){
    const btn = document.getElementById("toTop");
    if(!btn) return;
    const SHOW_AT = 8; // «scroll offset не 0» — крошечный порог гасит дрожание у самой кромки
    const upd = ()=>{ btn.classList.toggle("show", window.scrollY > SHOW_AT); };
    window.addEventListener("scroll", upd, {passive:true});
    window.addEventListener("resize", upd, {passive:true});
    btn.addEventListener("click", ()=> window.scrollTo({top:0, behavior:"smooth"}));
    upd();
  })();

  // pull-to-refresh: тянем вниз от самого верха → отпускаем за порогом → appRefresh()
  (function(){
    const ind = document.getElementById("ptr"); if(!ind) return;
    const TRIG = 70, MAX = 110, DAMP = 0.5;
    let startY = 0, pulling = false, dist = 0, refreshing = false;
    const scrollTop = ()=> window.scrollY || document.documentElement.scrollTop || 0;
    const canPTR = ()=> !!state.conn && !refreshing && !!document.getElementById("content");

    window.addEventListener("touchstart", e=>{
      if(!canPTR() || e.touches.length!==1 || scrollTop()>0){ pulling=false; return; }
      startY = e.touches[0].clientY; pulling = true; dist = 0;
      ind.style.transition = "none";
    }, {passive:true});

    window.addEventListener("touchmove", e=>{
      if(!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if(dy<=0 || scrollTop()>0){ pulling=false; dist=0; ind.style.transform="translateX(-50%) translateY(-100%)"; return; }
      dist = Math.min(MAX, dy*DAMP);
      if(e.cancelable) e.preventDefault();   // гасим нативный скролл/баунс, пока тянем
      ind.style.transform = `translateX(-50%) translateY(${dist}px)`;
      ind.classList.toggle("ready", dist>=TRIG);
    }, {passive:false});

    async function release(){
      if(!pulling) return; pulling=false;
      ind.style.transition = "transform .2s ease";
      if(dist>=TRIG && canPTR()){
        refreshing = true;
        ind.classList.remove("ready"); ind.classList.add("spin-on");
        ind.style.transform = "translateX(-50%) translateY(58px)";
        try{ await appRefresh(); }catch(e){}
        finally{ refreshing=false; ind.classList.remove("spin-on"); ind.style.transform="translateX(-50%) translateY(-100%)"; }
      } else {
        ind.classList.remove("ready");
        ind.style.transform = "translateX(-50%) translateY(-100%)";
      }
      dist = 0;
    }
    window.addEventListener("touchend", release, {passive:true});
    window.addEventListener("touchcancel", release, {passive:true});
  })();
}
