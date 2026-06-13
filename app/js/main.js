import { loadTheme, applyTheme } from "./core/theme.js";
applyTheme(loadTheme());

import { boot } from "./boot.js";
import { initPwa } from "./pwa.js";

boot();
initPwa();
