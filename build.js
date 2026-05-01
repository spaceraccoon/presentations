#!/usr/bin/env node

const { execFileSync } = require("child_process");
const { globSync } = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const buildAll = args.includes("--all");
const targets = args.filter((a) => !a.startsWith("--"));

let slides;

if (buildAll || targets.length === 0) {
  slides = globSync("[0-9][0-9][0-9][0-9]/*/slides.md");
  if (!buildAll && slides.length > 0) {
    console.log("Available presentations:");
    slides.forEach((f) => console.log(" ", path.dirname(f)));
    console.log(
      "\nUsage: npm run build [folder...]\n       npm run build:all\n"
    );
    console.log("Example: npm run build 2026/def-con-33-mic-drop-av-hardware");
    process.exit(0);
  }
} else {
  slides = targets.flatMap((t) => {
    // Accept either a folder path or a direct slides.md path
    const candidate = t.endsWith("slides.md") ? t : path.join(t, "slides.md");
    const matches = globSync(candidate);
    if (matches.length === 0) {
      console.error(`No slides found for: ${t}`);
      process.exit(1);
    }
    return matches;
  });
}

for (const f of slides) {
  console.log(`Building: ${f}`);
  execFileSync(
    "npx",
    ["marp", "--engine", "./engine.js", "--allow-local-files", "--pdf", f],
    { stdio: "inherit" }
  );
}
