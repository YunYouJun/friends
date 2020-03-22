const yaml = require("js-yaml");
const { readFileSync, mkdirSync, writeFileSync } = require("fs");

try {
  const links = yaml.safeLoad(readFileSync("./src/links.yml", "utf8"));
  try {
    mkdirSync("./dist/");
  } catch ({ code }) {
    if (code !== "EEXIST") return;
  }
  writeFileSync("./dist/links.json", JSON.stringify(links));
  console.log("Generated links.json successfully!");
} catch (e) {
  console.error(e);
}
