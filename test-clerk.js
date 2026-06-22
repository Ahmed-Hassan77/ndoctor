const { arSA, enUS } = require("@clerk/localizations");
console.log("arSA keys with placeholder:");
for (const key in arSA) {
  if (key.toLowerCase().includes("placeholder")) {
    console.log(key, arSA[key]);
  }
}
console.log("enUS keys with placeholder:");
for (const key in enUS) {
  if (key.toLowerCase().includes("placeholder")) {
    console.log(key, enUS[key]);
  }
}
