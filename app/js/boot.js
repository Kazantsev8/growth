import { state } from "./core/state.js";
import { loadConn } from "./core/conn.js";
import { loadConfig } from "./core/config.js";
import { viewApp, viewSetup } from "./app.js";

const root = document.getElementById("root");

export async function boot(){
  state.conn = loadConn();
  if(!state.conn){ viewSetup(); return; }
  root.innerHTML=`<div class="center"><div class="loading"><div class="spin"></div> loading config…</div></div>`;
  try{ state.modules=await loadConfig(); state.activeId=state.modules.length?state.modules[0].id:null; viewApp(); }
  catch(e){ viewSetup(state.conn); }
}
