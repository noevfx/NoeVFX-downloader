// Regressões: nunca baixar endereço genérico de feed (o bug do youtube.com/) + etapas da pilula.
"use strict";
const fs = require("fs"), path = require("path"), assert = require("assert");
const src = fs.readFileSync(path.join(__dirname, "..", "browser/content.js"), "utf8");

// --- resolução do card (YouTube fora do /watch + outros feeds) + guarda de feed genérico
const cardCode = src.slice(src.indexOf("  function ytCardInfo("), src.indexOf("  /* ------------------------------------------------------------------- thumb */"));
const { ytCardInfo, genericCardUrl, isGenericFeedUrl, cardIsLive } = new Function("location", "document", cardCode + ";return {ytCardInfo,genericCardUrl,isGenericFeedUrl,cardIsLive};")(
  { href: "https://www.youtube.com/", hostname: "www.youtube.com" },
  { body: {}, querySelectorAll: () => [] });

const a = (href) => ({ getAttribute: () => href });
const card = (links, videos, titleText, parent, liveBadge) => ({
  parentElement: parent || null,
  querySelectorAll: (s) => s === "video" ? Array(videos == null ? 1 : videos).fill({}) : links.map(a),
  querySelector: (s) => /live/i.test(s) ? (liveBadge ? {} : null)
    : (titleText && /title|h3|shortsLockup/i.test(s) ? { textContent: titleText } : null),
});
const vid = (parent) => ({ parentElement: parent, querySelectorAll: (s) => (s === "video" ? [{}] : []) });

// card com UM link de vídeo: resolve para o watch daquele vídeo (com o título do card)
const c1 = card(["/watch?v=ABC123-xy"], 1, "  Vídeo legal  ");
assert.deepEqual(ytCardInfo(vid(c1)), { url: "https://www.youtube.com/watch?v=ABC123-xy", title: "Vídeo legal", live: false });
// card com selo AO VIVO (badge ou "AO VIVO" no título): marcado como live
assert.equal(ytCardInfo(vid(card(["/watch?v=LIVE123ab"], 1, "", null, true))).live, true);
assert.equal(ytCardInfo(vid(card(["/watch?v=LIVE123ab"], 1, "CANAL AO VIVO AGORA"))).live, true);
// shorts também resolve para watch
assert.equal(ytCardInfo(vid(card(["/shorts/XYZ_123ab"]))).url, "https://www.youtube.com/watch?v=XYZ_123ab");
// card ambíguo (2 vídeos diferentes dentro): NUNCA adivinhar
assert.equal(ytCardInfo(vid(card(["/watch?v=AAA111", "/watch?v=BBB222"], 2))), null);
assert.equal(ytCardInfo(vid(card(["/watch?v=AAA111", "/shorts/BBB222"]))), null);
// sem link de vídeo: nada a inventar
assert.equal(ytCardInfo(vid(card(["/playlist?list=LL"]))), null);

// genericCardUrl: mesmo princípio em outros feeds
const gen = new Function("location", "document", cardCode + ";return {genericCardUrl,isGenericFeedUrl};")(
  { href: "https://vimeo.com/", hostname: "vimeo.com" }, { body: {} });
assert.equal(gen.genericCardUrl(vid(card(["/12345678"]))), "https://vimeo.com/12345678");
assert.equal(gen.genericCardUrl(vid(card(["/12345678", "/87654321"]))), "");
assert.equal(gen.genericCardUrl(vid(card(["/categories/animation"]))), "");

// guarda de feed: listas NÃO identificam um vídeo
for (const u of [
  "https://www.youtube.com/", "https://www.youtube.com/feed/trending", "https://www.youtube.com/results?q=x",
  "https://www.youtube.com/@canal", "https://youtu.be/", "https://www.linkedin.com/", "https://www.linkedin.com/feed/",
  "https://www.tiktok.com/", "https://www.tiktok.com/foryou", "https://www.instagram.com/", "https://www.instagram.com/explore/",
  "https://x.com/", "https://x.com/home", "https://www.facebook.com/", "https://www.facebook.com/watch/",
  "https://www.pinterest.com/", "https://vimeo.com/", "https://vimeo.com/categories", "https://www.dailymotion.com/",
  "https://www.twitch.tv/", "https://www.twitch.tv/directory", "https://www.twitch.tv/canal/videos",
  "https://g1.globo.com/", "https://g1.globo.com/politica/", "https://ge.globo.com/futebol/", "https://globoplay.globo.com/",
]) assert.equal(isGenericFeedUrl(u), true, u);
for (const u of [
  "https://www.youtube.com/watch?v=abcDEF12345", "https://www.youtube.com/shorts/abcDEF12345",
  "https://youtu.be/abcDEF12345", "https://www.linkedin.com/feed/update/urn:li:activity:7521645972955852801/",
  "https://www.linkedin.com/posts/user_x-7521645937023225856-EwUX/", "https://www.tiktok.com/@user/video/7000000000000000000",
  "https://www.instagram.com/reel/AbC123/", "https://x.com/user/status/1700000000000000000",
  "https://www.pinterest.com/pin/123456789/", "https://vimeo.com/12345678", "https://www.dailymotion.com/video/x8abcde",
  "https://www.twitch.tv/canal", "https://exemplo.com/",
  "https://g1.globo.com/politica/noticia/2026/11/15/materia-x.ghtml", "https://globoplay.globo.com/v/1234567/",
]) assert.equal(isGenericFeedUrl(u), false, u);

// card da Globo: o link da matéria (.ghtml) resolve
const g1 = new Function("location", "document", cardCode + ";return {genericCardUrl};")(
  { href: "https://g1.globo.com/", hostname: "g1.globo.com" }, { body: {} });
assert.equal(g1.genericCardUrl(vid(card(["/politica/noticia/2026/11/15/materia-x.ghtml"]))), "https://g1.globo.com/politica/noticia/2026/11/15/materia-x.ghtml");
assert.equal(g1.genericCardUrl(vid(card(["/materia-a.ghtml", "/materia-b.ghtml"]))), "");   // duas matérias: não adivinhar

// cardIsLive: selo AO VIVO dentro do card do vídeo
const box = (text, videos, parent) => ({ parentElement: parent || null, textContent: text,
  querySelectorAll: (s) => (s === "video" ? Array(videos == null ? 1 : videos).fill({}) : []) });
assert.equal(cardIsLive(vid(box("Enem 2026 AO VIVO Assistir agora"))), true);
assert.equal(cardIsLive(vid(box("assistir agora (ao vivo)"))), true);
assert.equal(cardIsLive(vid(box("matéria comum sem selo"))), false);
assert.equal(cardIsLive(vid(box("x", 1, box("selo AO VIVO de OUTRO card", 2)))), false);   // contêiner misturando cards: não vale

// --- pilula: nome e etapa de cada job
const jobsCode = src.slice(src.indexOf("  function jobName("), src.indexOf("  function renderJobs("));
const t = (k, ...args) => k + "(" + args.join("|") + ")";
const folderName = (p) => (p ? String(p).split(/[\\/]/).filter(Boolean).pop() : "");
const { jobName, stageLine } = new Function("t", "folderName", jobsCode + ";return {jobName,stageLine};")(t, folderName);

assert.equal(jobName({ title: "(3) YouTube", url: "https://x.com/a" }), "YouTube");
assert.equal(jobName({ title: "Aula 1", url: "https://x.com/a" }), "Aula 1");
assert.equal(jobName({ url: "https://www.tiktok.com/x" }), "tiktok.com");

assert.equal(stageLine({ status: "queued" }), "queuedWait()");
assert.equal(stageLine({ status: "downloading", progress: "42%", speed: "1 MB/s" }), "downloadingP(42% • 1 MB/s)");
assert.equal(stageLine({ status: "downloading", progress: "42%" }), "downloadingP(42%)");
assert.equal(stageLine({ status: "downloading" }), "downloading0()");
// etapa de conversão vem pronta do servidor e NÃO vira "Baixando convertendo..."
assert.equal(stageLine({ status: "downloading", progress: "convertendo para H.264 (NVENC) 45%" }), "convertendo para H.264 (NVENC) 45%");
assert.equal(stageLine({ status: "downloading", progress: "tentando modo compatível..." }), "tentando modo compatível...");
assert.equal(stageLine({ status: "merging" }), "mergingShort()");
assert.equal(stageLine({ status: "done", output_dir: "C:\\videos\\pasta x" }), "savedInShort(pasta x)");
assert.equal(stageLine({ status: "canceled" }), "canceledMsg()");
assert.equal(stageLine({ status: "error", error: "boom" }), "errShort(boom)");

console.log("feed_guard + pilula: 40+ verificações passaram");
