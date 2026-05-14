// Pre-render Medium RSS into blog.html between BLOG_POSTS_* markers.
// Runs in CI (Node 20+). No external deps — fetches the RSS feed directly.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BLOG_HTML = resolve(ROOT, "blog.html");
const FEED = "https://medium.com/feed/@francescodelorenzi";
const MAX_POSTS = 10;
const ABSTRACT_LIMIT = 280;

const escapeHtml = (s = "") =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripCdata = (s = "") =>
  s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");

const stripTags = (s = "") =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const matchAll = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "g");
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
};

const matchOne = (xml, tag) => {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : "";
};

function parseItems(xml) {
  return matchAll(xml, "item").map((raw) => {
    const title = stripCdata(matchOne(raw, "title")).trim();
    const link = stripCdata(matchOne(raw, "link")).trim();
    const pubDate = stripCdata(matchOne(raw, "pubDate")).trim();
    const contentEncoded = stripCdata(matchOne(raw, "content:encoded"));
    const description = stripCdata(matchOne(raw, "description"));
    const body = contentEncoded || description;
    const abstractRaw = stripTags(body);
    const abstract =
      abstractRaw.length > ABSTRACT_LIMIT
        ? abstractRaw.slice(0, ABSTRACT_LIMIT - 1).trimEnd() + "…"
        : abstractRaw;
    const dateIso = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : "";
    return { title, link, abstract, dateIso };
  });
}

function renderPosts(items) {
  if (!items.length) {
    return `<p>No posts yet. Read on <a href="https://medium.com/@francescodelorenzi" target="_blank" rel="noopener">Medium</a>.</p>`;
  }
  return items
    .slice(0, MAX_POSTS)
    .map(
      (i) => `<article class="blog-post">
                    <h2><a href="${escapeHtml(i.link)}" target="_blank" rel="noopener">${escapeHtml(i.title)}</a></h2>
                    ${i.dateIso ? `<p class="article-meta"><time datetime="${i.dateIso}">${i.dateIso}</time></p>` : ""}
                    <p>${escapeHtml(i.abstract)}</p>
                </article>`
    )
    .join("\n                ");
}

function replaceBlock(html, startMarker, endMarker, payload) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Markers ${startMarker} / ${endMarker} not found in blog.html`);
  }
  return (
    html.slice(0, start + startMarker.length) +
    "\n                " +
    payload +
    "\n                " +
    html.slice(end)
  );
}

async function main() {
  const res = await fetch(FEED, {
    headers: { "User-Agent": "delorenzi.me-blog-builder/1.0" },
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const xml = await res.text();
  const items = parseItems(xml);

  let html = await readFile(BLOG_HTML, "utf8");
  html = replaceBlock(
    html,
    "<!-- BLOG_POSTS_START -->",
    "<!-- BLOG_POSTS_END -->",
    renderPosts(items)
  );
  const builtAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  html = replaceBlock(
    html,
    "<!-- BLOG_META_START -->",
    "<!-- BLOG_META_END -->",
    `Rebuilt ${escapeHtml(builtAt)} · ${items.length} post${items.length === 1 ? "" : "s"}`
  );
  await writeFile(BLOG_HTML, html, "utf8");
  console.log(`Wrote ${items.length} posts to blog.html`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
