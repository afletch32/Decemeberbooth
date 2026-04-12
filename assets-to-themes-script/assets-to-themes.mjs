import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(scriptDir, ".."));

await import("../assets-to-themes.mjs");
