import { getText, putText } from "../core/dav.js";
import { bodyOf, parseFrontmatter } from "../core/md.js";
import { esc, setCount } from "../ui/dom.js";

// ——— Roadmap ———
function parseRoadmap(md){
  const lines = md.split(/\r?\n/);
  const phases=[]; let cp=null, cm=null;
  const reP=/^##\s+Phase\s+(\d+)\s*[—-]\s*(.+)$/;
  const reM=/^###\s+Milestone\s+([\d.]+)\s*[—-]\s*(.+)$/;
  const reS=/^\s*-\s*\[([ xX])\]\s*\*\*([\d.]+)\*\*\s*`([SML])`\s*(.+)$/;
  for(const ln of lines){
    let m;
    if(m=ln.match(reP)){ cp={id:m[1], name:m[2].trim(), milestones:[]}; phases.push(cp); cm=null; continue; }
    if(cp && (m=ln.match(reM))){ cm={id:m[1], name:m[2].trim(), sessions:[]}; cp.milestones.push(cm); continue; }
    if(cm && (m=ln.match(reS))){
      let rest=m[4].trim();
      const tags=(rest.match(/#[\w-]+/g)||[]).map(t=>t.slice(1));
      rest=rest.replace(/#[\w-]+/g,"").trim();
      let title=rest, desc="";
      const sep=rest.indexOf(" — ");
      if(sep>=0){ title=rest.slice(0,sep).trim(); desc=rest.slice(sep+3).trim(); }
      cm.sessions.push({id:m[2], size:m[3], title, desc, tags, done:/x/i.test(m[1])});
    }
  }
  return phases;
}
function setSession(md, id, done){
  const e=id.replace(/\./g,"\\.");
  md = md.replace(new RegExp("^(\\s*-\\s*\\[)[ xX](\\]\\s*\\*\\*"+e+"\\*\\*)","m"), "$1"+(done?"x":" ")+"$2");
  md = md.replace(new RegExp("^(\\|\\s*"+e+"\\s*\\|.*\\|\\s*)(?:✅|⬜|⬛|☑️)(\\s*\\|)\\s*$","m"), "$1"+(done?"✅":"⬜")+"$2");
  return md;
}
function syncRoadmapMeta(md){
  const all=[...md.matchAll(/^\s*-\s*\[([ xX])\]\s*\*\*[\d.]+\*\*\s*`[SML]`/gm)];
  const total=all.length, done=all.filter(m=>/x/i.test(m[1])).length;
  const pct=total?Math.round(done/total*100):0;
  md=md.replace(/(sessions_completed:\s*)\d+/, "$1"+done);
  md=md.replace(/(sessions_total:\s*)\d+/, "$1"+total);
  md=md.replace(/(percent_complete:\s*)\d+/, "$1"+pct);
  const nx=[...md.matchAll(/^\s*-\s*\[ \]\s*\*\*([\d.]+)\*\*/gm)][0];
  if(nx){ const id=nx[1], pr=id.split(".");
    md=md.replace(/(next_session:\s*)"[^"]*"/, '$1"'+id+'"');
    md=md.replace(/(current_phase:\s*)\d+/, "$1"+pr[0]);
    if(pr.length>=2) md=md.replace(/(current_milestone:\s*)"[^"]*"/, '$1"'+pr[0]+"."+pr[1]+'"');
  }
  const parts = md.split(/(?=^##\s+Phase\s+\d+\b)/m);
  for(let i=0;i<parts.length;i++){
    if(/^##\s+Phase\s+\d+/.test(parts[i])){
      const dn=(parts[i].match(/^\s*-\s*\[x\]\s*\*\*[\d.]+\*\*\s*`[SML]`/gmi)||[]).length;
      parts[i]=parts[i].replace(/(\*\*Done:\*\*\s*)\d+/, "$1"+dn);
    }
  }
  return parts.join("");
}
function rmBar(d,t,n,extra){
  const on=t?Math.round(d/t*n):0;
  let b=`<div class="segbar ${extra||""}">`;
  for(let i=0;i<n;i++) b+=`<div class="seg ${i<on?"on":""}"></div>`;
  return b+`</div>`;
}
async function renderRoadmap(filePath, host){
  let raw;
  try{ raw = await getText(filePath); }
  catch(e){ const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    host.innerHTML = code==="404" ? `<div class="empty">Нет файла <b>${esc(filePath.split("/").pop())}</b>.</div>` : `<div class="note err">Ошибка: ${esc(e.message)}</div>`; return; }
  let phases = parseRoadmap(bodyOf(raw));
  if(!phases.length){ host.innerHTML=`<div class="empty">Не удалось разобрать роадмап (нет фаз/сессий).</div>`; return; }
  let saving=false;
  const expanded=new Set(), openDesc=new Set();
  const fm=parseFrontmatter(raw)||{};
  let cur = fm.progress && fm.progress.current_phase!=null ? String(fm.progress.current_phase) : null;
  if(!cur){ const pp=phases.find(p=>p.milestones.some(m=>m.sessions.some(s=>!s.done))); cur=pp?pp.id:(phases[0]&&phases[0].id); }
  if(cur) expanded.add(cur);

  function find(id){ for(const p of phases) for(const m of p.milestones) for(const s of m.sessions) if(s.id===id) return s; return null; }
  function stat(arrFn){ let t=0,d=0; arrFn(s=>{t++; if(s.done)d++;}); return {t,d}; }
  function allStat(){ return stat(cb=>{ for(const p of phases) for(const m of p.milestones) for(const s of m.sessions) cb(s); }); }
  function phStat(p){ return stat(cb=>{ for(const m of p.milestones) for(const s of m.sessions) cb(s); }); }

  async function toggle(s){
    if(saving) return; saving=true;
    const prev=s.done; s.done=!s.done;
    raw = syncRoadmapMeta(setSession(raw, s.id, s.done));
    try{ await putText(filePath, raw); draw(); }
    catch(e){ s.done=prev; alert("Не удалось сохранить: "+e.message); }
    finally{ saving=false; }
  }

  function draw(){
    const a=allStat(); const pct=a.t?Math.round(a.d/a.t*100):0;
    setCount(a.d+" / "+a.t);
    let h=`<div class="rm-dash"><div class="rm-overall"><span class="rm-pct">${pct}%</span><span class="rm-sub">${a.d} / ${a.t} sessions</span></div>${rmBar(a.d,a.t,24)}</div>`;
    for(const p of phases){
      const ps=phStat(p); const open=expanded.has(p.id);
      h+=`<div class="rm-phase ${open?"open":""}">
        <div class="rm-phead" data-ph="${esc(p.id)}">
          <span class="pn">Phase ${esc(p.id)} · ${esc(p.name)}</span>
          <span class="pc">${ps.d}/${ps.t}</span><span class="rm-chev">${open?"−":"+"}</span>
        </div>
        ${rmBar(ps.d,ps.t,20,"rm-pbar")}`;
      if(open){
        h+=`<div class="rm-body">`;
        for(const ms of p.milestones){
          h+=`<div class="rm-ms">${esc(ms.id)} · ${esc(ms.name)}</div>`;
          for(const s of ms.sessions){
            const od=openDesc.has(s.id);
            h+=`<div class="rm-s">
              <button class="rm-cb ${s.done?"done":""}" data-cb="${esc(s.id)}">${s.done?"✓":""}</button>
              <div class="rm-smain" data-s="${esc(s.id)}">
                <div class="rm-stitle">${esc(s.title)}</div>
                <div class="rm-smeta"><span class="rm-size">${esc(s.size)}</span> · ${esc(s.id)}${s.tags.length?" · "+esc(s.tags.map(t=>"#"+t).join(" ")):""}</div>
                ${od&&s.desc?`<div class="rm-sdesc">${esc(s.desc)}</div>`:""}
              </div></div>`;
          }
        }
        h+=`</div>`;
      }
      h+=`</div>`;
    }
    host.innerHTML=h;
    host.querySelectorAll(".rm-phead").forEach(e=>e.onclick=()=>{ const id=e.dataset.ph; expanded.has(id)?expanded.delete(id):expanded.add(id); draw(); });
    host.querySelectorAll(".rm-cb").forEach(e=>e.onclick=(ev)=>{ ev.stopPropagation(); const s=find(e.dataset.cb); if(s) toggle(s); });
    host.querySelectorAll(".rm-smain").forEach(e=>e.onclick=()=>{ const id=e.dataset.s; openDesc.has(id)?openDesc.delete(id):openDesc.add(id); draw(); });
  }
  draw();
}

export { parseRoadmap, setSession, syncRoadmapMeta, rmBar, renderRoadmap };
