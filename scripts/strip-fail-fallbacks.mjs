import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const actionsDir = path.join(root, "actions");

function stripFile(filePath) {
  let c = fs.readFileSync(filePath, "utf8");
  const before = c;

  c = c.replace(
    /fail\(\s*"([^"]+)"\s*,\s*"([^"]*)"\s*\)/g,
    (m, code, detail) =>
      detail.startsWith("validation.") ? m : `fail("${code}")`
  );

  c = c.replace(
    /fail\(\s*"([^"]+)"\s*,\s*error\?\.\s*message\s*\|\|\s*"[^"]*"\s*\)/g,
    'fail("$1")'
  );

  c = c.replace(
    /fail\(\s*"([^"]+)"\s*,\s*err\?\.\s*message\s*\|\|\s*"[^"]*"\s*\)/g,
    'fail("$1")'
  );

  c = c.replace(/\?\? "Invalid(?: request| input)?"/g, '?? "validation.invalid"');
  c = c.replace(/\?\? "Invalid"/g, '?? "validation.invalid"');

  c = c.replace(
    /fail\(\s*\n\s*"([^"]+)"\s*,\s*\n\s*"([^"]*)"\s*\n\s*\)/g,
    (m, code, detail) =>
      detail.startsWith("validation.") ? m : `fail("${code}")`
  );

  if (c !== before) {
    fs.writeFileSync(filePath, c);
    console.log("updated", path.relative(root, filePath));
  }
}

for (const f of fs.readdirSync(actionsDir)) {
  if (f.endsWith(".js")) stripFile(path.join(actionsDir, f));
}
