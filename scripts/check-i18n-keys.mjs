import fs from "fs";
import path from "path";
import en from "../lib/dictionaries/en.js";
import ar from "../lib/dictionaries/ar.js";

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, p));
    } else {
      out[p] = typeof v;
    }
  }
  return out;
}

const fe = flatten(en);
const fa = flatten(ar);
const used = new Set();

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      if (["node_modules", ".next", "graduation_project", "scripts"].includes(f)) continue;
      walk(fp);
    } else if (/\.(jsx|js|mjs)$/.test(f)) {
      const c = fs.readFileSync(fp, "utf8");
      const re = /t\(\s*["']([^"']+)["']/g;
      let m;
      while ((m = re.exec(c))) used.add(m[1]);
    }
  }
}

["app", "components", "actions"].forEach(walk);

const missing = [...used].filter((k) => !(k in fe)).sort();
console.log("Used t() keys:", used.size);
console.log("Missing from EN dict:", missing.length);
if (missing.length) console.log(missing.join("\n"));
