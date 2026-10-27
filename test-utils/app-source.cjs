const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function listModules(directory) {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return listModules(absolute);
      return entry.isFile() && entry.name.endsWith(".mjs") ? [absolute] : [];
    })
    .sort();
}

function readAppSource() {
  const files = [path.join(root, "scripts/app.js"), ...listModules(path.join(root, "scripts/app"))];
  return files
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n")
    .replaceAll("__appRuntimeContext.", "");
}

function readAppHtml() {
  let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  return html.replace(
    /<link rel="stylesheet" href="((?:styles\/(?:app-(?:foundation|setup|booth|guest)|animations)\.css)|final-preview-sizing-fix\.css)(?:\?[^" ]*)?"\s*\/?\s*>/g,
    (_match, relativePath) => `<style>\n${fs.readFileSync(path.join(root, relativePath), "utf8")}\n</style>`
  );
}

function readAppModule(...parts) {
  return fs
    .readFileSync(path.join(root, "scripts/app", ...parts), "utf8")
    .replaceAll("__appRuntimeContext.", "");
}

function readTestProjectFile(...parts) {
  const relativePath = parts.join("/");
  if (relativePath === "index.html") return readAppHtml();
  if (relativePath === "scripts/app.js") return readAppSource();
  return fs.readFileSync(path.join(root, ...parts), "utf8");
}

module.exports = { readAppHtml, readAppModule, readAppSource, readTestProjectFile };
