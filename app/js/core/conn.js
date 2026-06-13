import { state } from "./state.js";

export const STORE_KEY = "growth.connection.v1";

export const DEFAULTS = {
  workerUrl: "https://growth-dav.vans-bleat.workers.dev",
  secret: "growth-7x9k2",
  login: "vans.bleat@mail.ru"
};

const mem = {};

// ——— подключение ———
export function loadConn(){ try{ const r=localStorage.getItem(STORE_KEY); if(r) return JSON.parse(r);}catch(e){} return mem[STORE_KEY]||null; }
export function saveConn(c){ mem[STORE_KEY]=c; try{ localStorage.setItem(STORE_KEY, JSON.stringify(c)); }catch(e){} }

export function authHeader(){ return "Basic " + btoa(state.conn.login + ":" + state.conn.password); }
