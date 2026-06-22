import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const actionsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "actions");

for (const f of fs.readdirSync(actionsDir)) {
  if (!f.endsWith(".js")) continue;
  const p = path.join(actionsDir, f);
  let c = fs.readFileSync(p, "utf8");
  const n = c.replace(/\?\? "Invalid[^"]*"/g, '?? "validation.invalid"');
  if (n !== c) {
    fs.writeFileSync(p, n);
    console.log("updated", f);
  }
}
