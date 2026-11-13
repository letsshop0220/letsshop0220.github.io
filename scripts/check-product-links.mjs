#!/usr/bin/env node
// Weekly check for Let's Shop0220.
// Hides a product only when the store page is clearly missing (404 or 410).
// A store that blocks automatic visits is left alone.

import fs from "node:fs";
import path from "node:path";

const write = process.argv.includes("--write");
const root = process.cwd();
const candidates = [
  "products.txt",
  "docs/products.txt",
  "public/products.txt",
  "src/data/products.txt",
];
const files = [...new Set(candidates.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file)))];

if (!files.length) {
  console.log("No products.txt found.");
  process.exit(0);
}

function productLines(text) {
  return text.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("|")) return null;
    const parts = trimmed.split("|").map((part) => part.trim());
    if (parts.length < 3 || !/^https?:\/\//i.test(parts[2])) return null;
    return { index, category: parts[0], name: parts[1], link: parts[2], raw: line };
  }).filter(Boolean);
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LetsShop0220LinkCheck/1.0; +https://github.com/)",
        Accept: "text/html",
      },
    });
    const finalUrl = response.url || url;
    const dead =
      response.status === 404 ||
      response.status === 410 ||
      /\/404|not-found|page-not-found|productnotfound/i.test(finalUrl);
    return { dead, status: response.status };
  } catch {
    return { dead: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

const allLinks = new Set();
const parsed = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = productLines(text);
  parsed.set(file, { text, lines });
  for (const line of lines) allLinks.add(line.link);
}

const results = new Map();
const queue = [...allLinks];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    if (!url) return;
    results.set(url, await check(url));
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));

const dead = [];
for (const [url, result] of results) {
  if (result.dead) dead.push(url);
}

const deadSet = new Set(dead);
let changed = false;
for (const [file, info] of parsed) {
  if (!info.lines.some((line) => deadSet.has(line.link))) continue;
  const rows = info.text.split(/\r?\n/);
  for (const line of info.lines) {
    if (!deadSet.has(line.link)) continue;
    const current = rows[line.index] ?? "";
    if (current.trim().startsWith("#")) continue;
    rows[line.index] = `# HIDDEN (page not found) ${current.trim()}`;
  }
  if (write) {
    fs.writeFileSync(file, rows.join("\n"));
    changed = true;
  }
}

const named = [];
for (const info of parsed.values()) {
  for (const line of info.lines) {
    if (deadSet.has(line.link) && !named.some((item) => item.link === line.link && item.name === line.name)) {
      named.push(line);
    }
  }
}

const report = [
  "Let's Shop0220 link check",
  "",
  named.length
    ? "These links look like the page is gone. They were hidden so shoppers will not land on a missing page. Delete the hidden line, or paste a new link."
    : "Every link that could be checked still opens. Nothing was hidden.",
  "",
  ...named.map((item) => `- ${item.category} | ${item.name} | ${item.link}`),
  "",
].join("\n");

const reportPath = path.join(path.dirname(files[0]), "link-check-report.txt");
if (write) fs.writeFileSync(reportPath, report);
console.log(report);
console.log(changed ? "Updated the product list." : "No product list changes.");
process.exit(named.length ? 2 : 0);
