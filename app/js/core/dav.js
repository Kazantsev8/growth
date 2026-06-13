import { state } from "./state.js";
import { authHeader } from "./conn.js";

export const CONFIG_PATH = "GrowthApp/config.md";
export const PROPFIND_BODY =
  '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop>' +
  '<d:getlastmodified/><d:getcontentlength/><d:resourcetype/></d:prop></d:propfind>';

// ——— WebDAV через воркер ———
export function encodePath(p){ const tr=p.endsWith("/"); const e="/"+p.split("/").filter(Boolean).map(encodeURIComponent).join("/"); return tr?e+"/":e; }
export async function dav(method, path, opts){
  opts = opts || {};
  const base = state.conn.workerUrl.replace(/\/+$/, "");
  const headers = { "Authorization": authHeader(), "X-Proxy-Secret": state.conn.secret };
  if(opts.depth != null) headers["Depth"] = String(opts.depth);
  if(opts.body != null) headers["Content-Type"] = opts.contentType || "application/xml";
  return fetch(base + encodePath(path), { method, headers, body: opts.body });
}
export async function getText(path){ const r=await dav("GET",path); if(!r.ok) throw new Error("HTTP "+r.status); return r.text(); }
export async function putText(path, text){ const r=await dav("PUT", path, {body:text, contentType:"text/markdown; charset=utf-8"}); if(!r.ok) throw new Error("HTTP "+r.status); }
export function norm(p){ return "/" + p.split("/").filter(Boolean).join("/"); }
export async function listDir(path){
  const dir = path.endsWith("/")?path:path+"/";
  const res = await dav("PROPFIND", dir, { body: PROPFIND_BODY, depth: 1 });
  if(!res.ok) throw new Error("HTTP " + res.status);
  const xml = new DOMParser().parseFromString(await res.text(), "application/xml");
  const ns="DAV:", reqNorm=norm(path), out=[];
  for(const r of xml.getElementsByTagNameNS(ns,"response")){
    const hEl=r.getElementsByTagNameNS(ns,"href")[0];
    const href=decodeURIComponent(hEl?hEl.textContent:"");
    if(norm(href)===reqNorm) continue;
    const isDir=!!r.getElementsByTagNameNS(ns,"collection")[0];
    const sEl=r.getElementsByTagNameNS(ns,"getcontentlength")[0];
    out.push({ path:norm(href), name:norm(href).split("/").pop(), isDir, size:sEl?+sEl.textContent:null });
  }
  out.sort((a,b)=> (a.isDir!==b.isDir)?(a.isDir?-1:1):a.name.localeCompare(b.name,'ru'));
  return out;
}
export async function ensureDir(path){               // MKCOL по цепочке (существующие — игнор)
  const parts = path.split("/").filter(Boolean);
  let acc = "";
  for(const p of parts){ acc += "/" + p; try{ await dav("MKCOL", acc + "/"); }catch(e){} }
}
export async function putBytes(path, blob, contentType){
  const r = await dav("PUT", path, { body:blob, contentType:contentType||"application/octet-stream" });
  if(!r.ok) throw new Error("HTTP " + r.status);
}
export async function davDelete(path){
  const r = await dav("DELETE", path);
  if(!r.ok && r.status!==404) throw new Error("HTTP " + r.status);
}
