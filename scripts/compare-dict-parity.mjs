import en from "../lib/dictionaries/en.js";
import ar from "../lib/dictionaries/ar.js";

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(v, p));
    } else {
      out[p] = true;
    }
  }
  return out;
}

const fe = flatten(en);
const fa = flatten(ar);
const enOnly = Object.keys(fe).filter((k) => !(k in fa)).sort();
const arOnly = Object.keys(fa).filter((k) => !(k in fe)).sort();
console.log("EN keys:", Object.keys(fe).length);
console.log("AR keys:", Object.keys(fa).length);
console.log("Only in EN:", enOnly.length);
if (enOnly.length) console.log(enOnly.join("\n"));
console.log("Only in AR:", arOnly.length);
if (arOnly.length) console.log(arOnly.join("\n"));
