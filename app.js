const TONES = ["blush", "sand", "ink"];
const GROUPS = [
  { label: "Beauty", categories: ["Makeup", "Skincare", "Hair"] },
  { label: "Clothes", categories: ["Jeans", "Tops", "Dresses", "Jackets & Coats", "Activewear"] },
  { label: "Extras", categories: ["Shoes", "Bags", "Jewelry & Accessories"] },
];
const STORES = [
  ["sephora.com", "Sephora"],
  ["ulta.com", "Ulta Beauty"],
  ["target.com", "Target"],
  ["oldnavy.gap.com", "Old Navy"],
  ["gap.com", "Gap"],
  ["levi.com", "Levi's"],
  ["abercrombie.com", "Abercrombie & Fitch"],
  ["nike.com", "Nike"],
  ["adidas.com", "adidas"],
  ["mejuri.com", "Mejuri"],
  ["kendrascott.com", "Kendra Scott"],
  ["longchamp.com", "Longchamp"],
  ["amazon.com", "Amazon"],
  ["tiktok.com", "TikTok"],
];

const shop = document.querySelector("#shop");
const chips = document.querySelector("#chips");
const search = document.querySelector("#search");
let products = [];

document.querySelector("#copy").textContent = `© Let's Shop0220 ${new Date().getFullYear()}`;
document.querySelector("#home").addEventListener("click", () => scrollToId("top"));

function isHttp(value) {
  return /^https?:\/\//i.test(value || "");
}

function parseProducts(text) {
  const items = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length < 3 || !isHttp(parts[2])) continue;
    items.push({
      category: parts[0],
      name: parts[1],
      link: parts[2],
      photo: isHttp(parts[3] || "") ? parts[3] : "",
    });
  }
  return items;
}

function parseSettings(text) {
  const settings = {
    tagline: "Fashion and beauty finds, gathered in one place.",
    contact: "",
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("|")) continue;
    const parts = line.split("|").map((part) => part.trim());
    const key = (parts[0] || "").toLowerCase();
    const value = parts.slice(1).join("|").trim();
    if (key === "tagline" && value) settings.tagline = value;
    if (key === "contact") settings.contact = value;
  }
  return settings;
}

function slugify(value) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function storeName(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    const match = STORES.find(([domain]) => host === domain || host.endsWith(`.${domain}`));
    if (match) return match[1];
    const base = host.split(".")[0] || "Shop";
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "Shop";
  }
}

function isVideo(category) {
  return category.trim().toLowerCase() === "videos";
}

function hash(value) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildSections(list) {
  const videos = list.filter((item) => isVideo(item.category));
  const rest = list.filter((item) => !isVideo(item.category));
  const used = new Set();
  const sections = [];
  for (const group of GROUPS) {
    const categories = [];
    for (const name of group.categories) {
      const items = rest.filter((item) => item.category.toLowerCase() === name.toLowerCase());
      if (!items.length) continue;
      categories.push({ name, items });
      used.add(name.toLowerCase());
    }
    if (categories.length) sections.push({ label: group.label, categories });
  }
  const extra = [];
  for (const item of rest) {
    const key = item.category.toLowerCase();
    if (used.has(key)) continue;
    let bucket = extra.find((category) => category.name.toLowerCase() === key);
    if (!bucket) {
      bucket = { name: item.category, items: [] };
      extra.push(bucket);
      used.add(key);
    }
    bucket.items.push(item);
  }
  if (extra.length) sections.push({ label: "More", categories: extra });
  return { sections, videos };
}

function card(product) {
  const watching = isVideo(product.category);
  const link = el("a", "card");
  link.href = product.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const tile = el("div", "tile");
  tile.dataset.tone = TONES[Math.abs(hash(product.category)) % TONES.length];
  if (product.photo) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = product.photo;
    image.addEventListener("error", () => {
      image.remove();
      tile.append(el("span", "tile-word", watching ? "Watch" : product.category));
    });
    tile.append(image);
  } else {
    tile.append(el("span", "tile-word", watching ? "Watch" : product.category));
  }
  link.append(
    tile,
    el("h3", "card-name", product.name),
    el("p", "card-store", storeName(product.link)),
    el("span", "card-go", watching ? "Watch" : "Shop"),
  );
  return link;
}

function render() {
  const needle = search.value.trim().toLowerCase();
  const filtered = needle
    ? products.filter((item) => `${item.category} ${item.name} ${storeName(item.link)}`.toLowerCase().includes(needle))
    : products;
  const { sections, videos } = buildSections(filtered);
  shop.replaceChildren();
  const wrap = el("div", "wrap");
  if (!filtered.length) {
    wrap.append(el("p", "empty", "Nothing matches that search. Try a product or a category name."));
  }
  for (const section of sections) {
    const group = el("div", "group");
    group.append(el("p", "group-label", section.label));
    for (const category of section.categories) {
      const block = el("section", "section");
      block.id = slugify(category.name);
      block.dataset.section = block.id;
      block.append(el("h2", "section-title", category.name));
      const grid = el("div", "grid");
      category.items.forEach((item) => grid.append(card(item)));
      block.append(grid);
      group.append(block);
    }
    wrap.append(group);
  }
  if (videos.length) {
    const group = el("div", "group");
    group.append(el("p", "group-label", "Watch"));
    const block = el("section", "section");
    block.id = "videos";
    block.dataset.section = "videos";
    block.append(el("h2", "section-title", "Videos"));
    const grid = el("div", "grid");
    videos.forEach((item) => grid.append(card(item)));
    block.append(grid);
    group.append(block);
    wrap.append(group);
  }
  shop.append(wrap);

  const names = sections.flatMap((section) => section.categories.map((category) => category.name));
  if (videos.length) names.push("Videos");
  chips.replaceChildren();
  const all = el("button", "chip", "All");
  all.type = "button";
  all.addEventListener("click", () => scrollToId("top"));
  chips.append(all);
  for (const name of names) {
    const button = el("button", "chip", name);
    button.type = "button";
    button.addEventListener("click", () => scrollToId(slugify(name)));
    chips.append(button);
  }
}

search.addEventListener("input", render);

async function start() {
  try {
    const [productFile, settingsFile] = await Promise.all([
      fetch("products.txt", { cache: "no-store" }).then((response) => response.text()),
      fetch("settings.txt", { cache: "no-store" }).then((response) => response.text()),
    ]);
    products = parseProducts(productFile);
    const settings = parseSettings(settingsFile);
    document.querySelector("#tagline").textContent = settings.tagline;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contact)) {
      const contact = document.querySelector("#contact");
      contact.hidden = false;
      contact.href = `mailto:${settings.contact}?subject=Let's%20Shop0220`;
    }
  } catch {
    shop.append(el("p", "empty", "The product list could not be read."));
    return;
  }
  render();
}

start();
