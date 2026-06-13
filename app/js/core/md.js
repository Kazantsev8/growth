// ——— конфиг / frontmatter ———
export function parseFrontmatter(md){ const m=md.match(/^---\s*\n([\s\S]*?)\n---/); return m?(window.jsyaml.load(m[1])||{}):null; }
export function bodyOf(md){ const m=md.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)$/); return m?m[1]:md; }

export function slugify(text){
  return (text||"").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu,"")   // убрать пунктуацию/эмодзи, оставить буквы (вкл. кириллицу), цифры, пробелы, дефис
    .replace(/\s/g,"-");                // каждый пробел → дефис (не схлопываем — двойные сохраняем как в оглавлении)
}
