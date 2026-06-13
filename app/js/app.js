import { state } from "./core/state.js";
import { DEFAULTS, saveConn } from "./core/conn.js";
import { loadConfig } from "./core/config.js";
import { curTheme, toggleTheme } from "./core/theme.js";
import { el, esc } from "./ui/dom.js";
import { renderVocabulary } from "./kinds/vocabulary.js";
import { renderDoc } from "./kinds/doc.js";
import { renderNotes } from "./kinds/notes.js";
import { renderRoadmap } from "./kinds/roadmap.js";
import { renderDocList } from "./kinds/doclist.js";
import { renderChecklist } from "./kinds/checklist.js";
import { renderTasks } from "./kinds/tasks.js";
import { renderSport } from "./kinds/sport.js";
import { renderFallback } from "./kinds/fallback.js";

// ——— экраны ———
const root = document.getElementById("root");

// центрирует активный элемент в горизонтальной ленте; меняет только scrollLeft контейнера
function centerInScroller(scroller, activeEl){
  if(!scroller || !activeEl) return;
  const cr = scroller.getBoundingClientRect(), er = activeEl.getBoundingClientRect();
  scroller.scrollLeft += (er.left - cr.left) - (scroller.clientWidth - activeEl.offsetWidth) / 2;
}

export function viewApp(){
  root.innerHTML="";
  const wrap = el(`<div class="wrap"></div>`);
  wrap.appendChild(el(`<header class="app">
    <div><div class="brand">growth<span class="dot">.</span></div><div class="brand-sub">${state.modules.length} directions</div></div>
    <div class="head-actions"><button class="hbtn" id="themeBtn">${curTheme()==="dark"?"LIGHT":"DARK"}</button><button class="hbtn" id="setBtn">Settings</button></div>
  </header>`));
  wrap.appendChild(el(`<hr class="rule">`));

  const tabs = el(`<div class="tabs"></div>`);
  let activeTabEl = null;
  state.modules.forEach((m,i)=>{
    const t=el(`<button class="tab ${m.id===state.activeId?"active":""}" style="animation-delay:${i*45}ms"><span class="ti">${esc(m.icon||"•")}</span>${esc(m.title||m.id)}</button>`);
    if(m.id===state.activeId) activeTabEl = t;
    t.onclick=()=>{ state.activeId=m.id; state.activeArtifact=null; viewApp(); };
    tabs.appendChild(t);
  });
  wrap.appendChild(tabs);

  const m = state.modules.find(x=>x.id===state.activeId) || state.modules[0];
  wrap.appendChild(el(`<div class="sec"><div class="sec-l"><span class="sec-ico">${esc(m?m.icon:"")}</span><h2>${esc(m?(m.title||m.id):"")}</h2></div><span class="sec-count" id="secCount"></span></div>`));
  wrap.appendChild(el(`<hr class="rule-thin">`));
  const host = el(`<div id="content"><div class="loading"><div class="spin"></div> reading…</div></div>`);
  wrap.appendChild(host);
  root.appendChild(wrap);

  // держим активную вкладку в кадре: пересборка сбрасывает горизонтальный скролл
  centerInScroller(tabs, activeTabEl);

  document.getElementById("themeBtn").onclick = toggleTheme;
  document.getElementById("setBtn").onclick = ()=>{ if(confirm("Изменить подключение?")) viewSetup(state.conn); };

  if(!m){ host.innerHTML=`<div class="empty">Нет включённых направлений в config.md</div>`; return; }
  renderModule(m, host);
}

function moduleArtifacts(m){
  if(Array.isArray(m.artifacts) && m.artifacts.length) return m.artifacts;
  return [{ id:m.id, title:m.title||m.id, kind:m.kind, file:m.file, path:m.path }];  // одиночный артефакт = сам модуль
}
function artifactPath(m, a){
  const base = m.path || "";
  if(a.file) return base ? base + "/" + a.file : a.file;
  return a.path || base;
}

async function renderArtifact(m, a, host){
  const fp = artifactPath(m, a);
  if(!fp){ host.innerHTML=`<div class="note err">У артефакта не задан file/path в config.md</div>`; return; }
  try{
    if(a.kind==="vocabulary")      await renderVocabulary(fp, host);
    else if(a.kind==="doc")        await renderDoc(fp, host);
    else if(a.kind==="notes")      await renderNotes(fp, host);
    else if(a.kind==="roadmap")    await renderRoadmap(fp, host);
    else if(a.kind==="doclist")    await renderDocList(fp, host, a);
    else if(a.kind==="checklist")  await renderChecklist({path:fp, id:m.id}, host);
    else if(a.kind==="tasks")      await renderTasks(fp, host);
    else if(a.kind==="sport")      await renderSport(fp, host);
    else                           await renderFallback({path:fp, kind:a.kind, id:m.id}, host);
  }catch(e){
    const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    host.innerHTML=`<div class="note err">${code==="404"?"Не найдено в vault — проверь путь (регистр и пробелы важны).":"Ошибка: "+esc(e.message)}</div>`;
  }
}

async function renderModule(m, host){
  const arts = moduleArtifacts(m);
  let a = arts.find(x=>x.id===state.activeArtifact) || arts[0];
  state.activeArtifact = a.id;

  host.innerHTML = "";
  if(arts.length > 1){
    const st = el(`<div class="subtabs"></div>`);
    let activeSubEl = null;
    arts.forEach(x=>{
      const b = el(`<button class="subtab ${x.id===a.id?"active":""}">${esc(x.title||x.id)}</button>`);
      if(x.id===a.id) activeSubEl = b;
      b.onclick = ()=>{ state.activeArtifact = x.id; renderModule(m, host); };
      st.appendChild(b);
    });
    host.appendChild(st);
    centerInScroller(st, activeSubEl);
  }
  const content = el(`<div id="artContent"><div class="loading"><div class="spin"></div> reading…</div></div>`);
  host.appendChild(content);
  renderArtifact(m, a, content);
}

export function viewSetup(prefill){
  prefill = prefill || state.conn || {};
  root.innerHTML="";
  const c = el(`<div class="center setup">
    <div class="brand">growth<span class="dot">.</span></div>
    <div class="lead">Введи пароль приложения Mail.ru, чтобы войти.</div>
    <div class="field"><label>Пароль приложения</label><input id="f_pass" type="password" placeholder="пароль для внешнего приложения" value="${esc(prefill.password||"")}">
      <div class="hint">Не пароль от почты. Хранится только на этом устройстве.</div></div>
    <button class="btn" id="f_go">Войти</button>
    <div class="formerr" id="f_err"></div>
  </div>`);
  root.appendChild(c);
  const go=c.querySelector("#f_go");
  go.onclick = async ()=>{
    const cand={
      workerUrl: prefill.workerUrl || DEFAULTS.workerUrl,
      secret:    prefill.secret    || DEFAULTS.secret,
      login:     prefill.login     || DEFAULTS.login,
      password:  c.querySelector("#f_pass").value
    };
    if(!cand.password){ c.querySelector("#f_err").textContent="Введи пароль."; return; }
    go.disabled=true; go.textContent="Проверяю…"; state.conn=cand;
    try{ state.modules=await loadConfig(); saveConn(cand); state.activeId=state.modules.length?state.modules[0].id:null; viewApp(); }
    catch(e){ state.conn=null; go.disabled=false; go.textContent="Войти"; c.querySelector("#f_err").textContent="Не вышло: "+e.message; }
  };
  const pass=c.querySelector("#f_pass");
  pass.addEventListener("keydown", e=>{ if(e.key==="Enter") go.click(); });
  pass.focus();
}

// перечитать текущий раздел с WebDAV (для pull-to-refresh)
export async function appRefresh(){
  if(!state.conn) return;
  const m = state.modules.find(x=>x.id===state.activeId);
  const host = document.getElementById("content");
  if(m && host) await renderModule(m, host);
}
