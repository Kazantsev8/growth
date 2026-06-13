import { getText } from "../core/dav.js";
import { bodyOf, slugify } from "../core/md.js";
import { el, esc, setCount } from "../ui/dom.js";

export async function renderDoc(filePath, host){
  setCount("");
  let md;
  try{ md = await getText(filePath); }
  catch(e){
    const code=(String(e.message).match(/HTTP (\d+)/)||[])[1];
    host.innerHTML = code==="404"
      ? `<div class="empty">Файла нет: <b>${esc(filePath.split("/").pop())}</b></div>`
      : `<div class="note err">Ошибка: ${esc(e.message)}</div>`;
    return;
  }
  const wrap = el(`<div class="doc"></div>`);
  wrap.innerHTML = window.marked ? marked.parse(bodyOf(md)) : esc(bodyOf(md));
  // якоря оглавления: проставляем заголовкам id по GitHub-слагу и скроллим по клику
  const seen = {};
  wrap.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach(h=>{
    let slug = slugify(h.textContent);
    if(seen[slug]!=null){ seen[slug]++; slug = slug + "-" + seen[slug]; } else seen[slug]=0;
    if(!h.id) h.id = slug;
  });
  wrap.addEventListener("click", e=>{
    const a = e.target.closest('a[href^="#"]'); if(!a) return;
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    let t=null; try{ t = wrap.querySelector("#"+CSS.escape(id)); }catch(_){}
    if(!t) t = wrap.querySelector('[id="'+id.replace(/"/g,'\\"')+'"]');
    if(t){ e.preventDefault(); t.scrollIntoView({behavior:"smooth", block:"start"}); }
  });
  host.innerHTML = "";
  host.appendChild(wrap);
}
