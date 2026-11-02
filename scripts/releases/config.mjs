import { readFileSync } from "node:fs";

export function projects() {
  return JSON.parse(
    readFileSync(new URL("./projects.json", import.meta.url), "utf8"),
  );
}

export function project(key) {
  const value = projects().find((item) => item.key === key);
  if (!value) throw new Error("Unknown release project");
  return value;
}
