import { execFileSync } from "node:child_process";
import { project } from "./config.mjs";

const [key, task] = process.argv.slice(2);
const config = project(key);
const tasks = {
  quality: config.quality,
  browser: [config.browser],
  browserInstall: [config.browserInstall],
};
if (!Object.hasOwn(tasks, task)) throw new Error("Unknown release task");
for (const [command, ...args] of tasks[task])
  execFileSync(command, args, { stdio: "inherit" });
