import { CONFIG_PATH, getText } from "./dav.js";
import { parseFrontmatter } from "./md.js";

export async function loadConfig(){
  const data = parseFrontmatter(await getText(CONFIG_PATH));
  if(!data) throw new Error("нет frontmatter в config.md");
  return (Array.isArray(data.modules)?data.modules:[]).filter(m=>m&&m.enabled!==false).sort((a,b)=>(a.order||0)-(b.order||0));
}
