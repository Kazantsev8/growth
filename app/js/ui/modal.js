import { el, esc } from "./dom.js";

export function showConfirm(msg, okText){
  return new Promise(res=>{
    const ov = el(`<div class="modal-ov"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <div class="modal-btns">
        <button class="btn ghost" id="mc_no">Отмена</button>
        <button class="btn" id="mc_yes">${esc(okText||"Удалить")}</button>
      </div></div></div>`);
    document.body.appendChild(ov);
    const done = v => { ov.remove(); document.removeEventListener("keydown", onKey); res(v); };
    function onKey(e){ if(e.key==="Escape") done(false); if(e.key==="Enter") done(true); }
    document.addEventListener("keydown", onKey);
    ov.querySelector("#mc_yes").onclick = ()=>done(true);
    ov.querySelector("#mc_no").onclick = ()=>done(false);
    ov.onclick = e => { if(e.target===ov) done(false); };
    ov.querySelector("#mc_yes").focus();
  });
}
export function showPrompt(msg, def, okText){
  return new Promise(res=>{
    const ov = el(`<div class="modal-ov"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <input class="modal-input" id="mp_in" value="${esc(def||"")}" autocomplete="off">
      <div class="modal-btns">
        <button class="btn ghost" id="mp_no">Отмена</button>
        <button class="btn" id="mp_ok">${esc(okText||"OK")}</button>
      </div></div></div>`);
    document.body.appendChild(ov);
    const inp = ov.querySelector("#mp_in");
    const done = v => { ov.remove(); document.removeEventListener("keydown", onKey); res(v); };
    function onKey(e){ if(e.key==="Escape") done(null); if(e.key==="Enter") done(inp.value); }
    document.addEventListener("keydown", onKey);
    ov.querySelector("#mp_ok").onclick = ()=>done(inp.value);
    ov.querySelector("#mp_no").onclick = ()=>done(null);
    ov.onclick = e => { if(e.target===ov) done(null); };
    inp.focus(); inp.select();
  });
}
