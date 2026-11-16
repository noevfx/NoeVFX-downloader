/* ============================================================================
   Noe VFX Downloader — Popup v3.2.2 (i18n pt/en)
   ========================================================================== */
"use strict";

const $ = (id) => document.getElementById(id);
const t = (k, ...s) => (globalThis.__nvfT ? globalThis.__nvfT(k, ...s) : k);

const srv = $("srv");
const urlInput = $("urlInput");
const streamsEl = $("streams");
const statusEl = $("status");
const themeBtn = $("themeBtn");
const refreshBtn = $("refreshBtn");
const settingsBtn = $("settingsBtn");
const destPath = $("destPath");
const setupBox = $("setup");
const setupBtn = $("setupBtn");
const openFolderBtn = $("openFolderBtn");
const changeFolderBtn = $("changeFolderBtn");
const allBtn = $("allBtn");
const countPill = $("countPill");
const fabBtn = $("fabBtn");
const verEl = $("ver");
const cancelBtn = $("cancelBtn");
const barWrap = $("barWrap");
const bar = $("bar");

let currentTab = null;
let currentJob = null;          // último download em andamento (o botão Cancelar age nele)
let streams = [];
let cfg = null;
let serverOnline = false;

const RANK = { "HLS": 5, "DASH": 4, "MP4": 3, "WebM": 2, "Áudio": 1, "Audio": 1, "HTML5": 3, "Rede": 3, "Network": 3, "Embed": 4, "YouTube": 6, "Globo/G1": 6 };

const send = (msg) =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => resolve(r || { ok: false }));
    } catch (_) {
      resolve({ ok: false });
    }
  });

/* ---------------------------------------------------------------- idioma -- */
if (globalThis.__nvfI18n) globalThis.__nvfI18n.applyStatic();
if (verEl) verEl.textContent = "v" + chrome.runtime.getManifest().version;

/* ---------------------------------------------------------------- tema ---- */
chrome.storage.local.get(["theme"], (res) => {
  document.documentElement.setAttribute("data-theme", (res && res.theme) || "dark");
});
themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  chrome.storage.local.set({ theme: cur });
});

/* ------------------------------------------------------------ configuração - */
function prettyFolder(p) {
  if (!p) return t("folderLabel");
  const parts = String(p).split(/[\\/]+/).filter(Boolean);
  return parts.slice(-2).join("/") || p;
}

function applyConfig(c) {
  if (!c) return;
  if ((!cfg || cfg.default_quality !== c.default_quality) && $("quickQuality")) $("quickQuality").value = ["best","1080","720"].includes(c.default_quality) ? c.default_quality : "best";
  cfg = c;
  destPath.textContent = prettyFolder(c.output_dir);
  destPath.title = c.output_dir || "";
  setupBox.classList.toggle("show", !c.onboarded);
  const on = c.fab_enabled !== false;
  fabBtn.classList.toggle("on", on);
  fabBtn.classList.toggle("off", !on);
  fabBtn.title = on ? t("iconEnabled") : t("iconDisabled");
  const cb = $("compatBox");
  if (cb) cb.checked = c.compat_h264 === true;
}

async function loadConfig(force) {
  const r = await send({ type: "GET_CONFIG", force: !!force });
  if (r && r.config) applyConfig(r.config);
  return r;
}

/* ---------------------------------------------------------------- server -- */
let srvVersion = "";
async function checkHealth() {
  const r = await send({ type: "HEALTH" });
  serverOnline = !!(r && r.ok);
  srvVersion = (r && r.data && r.data.version) || "";
  const panelStage = r && r.data && r.data.panel_setup;
  const panelNotice = $("panelSetup");
  if (panelNotice) {
    const known = ["checking", "downloading", "verifying", "installing", "done", "error"];
    panelNotice.classList.toggle("show", known.includes(panelStage));
    if (known.includes(panelStage)) panelNotice.textContent = t("panel_" + panelStage);
  }
  srv.textContent = serverOnline ? t("online") : t("offline");
  srv.classList.toggle("on", serverOnline);
  srv.classList.toggle("off", !serverOnline);
  if (!serverOnline) statusEl.textContent = r && r.forbidden ? t("forbiddenMsg") : t("offlineHint");
  else if (r.outdated) statusEl.textContent = t("outdatedMsg");
  else if (r.data && r.data.ffmpeg_ok === false) statusEl.textContent = t("ffmpegMissing");
  return serverOnline;
}

/* --------------------------------------------------------------- streams -- */
/* O MESMO vídeo chega por dois caminhos: o player (Globo/G1 /v/ID/) e o stream que o player puxa pela rede
   (…/ID.m3u8). Junta os dois num item só, pelo id do vídeo, e mostra o do player (o mais confiável). */
function globoIdOf(it) { const m = it.kind === "Globo/G1" && String(it.url).match(/\/v\/(\d{7,})/); return m ? m[1] : ""; }

function groupize(list) {
  const map = new Map();
  const gids = list.map(globoIdOf).filter(Boolean);
  const groupKeyOf = (it) => {
    const own = globoIdOf(it);
    if (own) return "globo:" + own;
    for (const id of gids) if (new RegExp("(^|[^\d])" + id + "([^\d]|$)").test(String(it.url).split("?")[0])) return "globo:" + id;
    return it.group || it.url;
  };
  for (const it of list) {
    const k = groupKeyOf(it);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  }
  // dentro de um grupo HLS, a playlist PRINCIPAL vale mais que a de uma qualidade só ("...-video=1320960.m3u8")
  const variant = (u) => /[=_]\d+(-|\.)|-(video|audio)=|chunklist|\/(video|audio)_/i.test(String(u).split("?")[0].split("/").pop()) ? 1 : 0;
  const out = [...map.entries()].map(([key, arr]) => {
    arr.sort((a, b) => ((RANK[b.kind] || 0) - (RANK[a.kind] || 0)) || (variant(a.url) - variant(b.url)));
    return { key, best: arr[0], count: arr.length, pri: Math.max(...arr.map((x) => x.pri || 0)) };
  });
  // o vídeo que está TOCANDO (ou à vista) vem primeiro; o resto mantém a ordem de chegada
  return out.map((g, i) => ({ g, i })).sort((a, b) => (b.g.pri - a.g.pri) || (a.i - b.i)).map((x) => x.g);
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return url.slice(0, 40); }
}

function shortPath(url) {
  try {
    const u = new URL(url);
    const q = u.search ? u.search.slice(0, 18) : "";
    return (u.pathname.length > 28 ? "…" + u.pathname.slice(-28) : u.pathname) + q;
  } catch (_) {
    return url.slice(0, 42);
  }
}

const thumbCache = new Map();

function thumbNode(item) {
  const src = item.thumb || thumbCache.get(item.url) || "";
  if (src && /^(https?:|data:image)/i.test(src)) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = src;
    img.addEventListener("error", () => {
      img.replaceWith(placeholder(item.kind));
    });
    return img;
  }
  return placeholder(item.kind);
}

function placeholder(kind) {
  const d = document.createElement("div");
  d.className = "thumb-ph";
  d.textContent = "▶";                // o tipo (HLS/MP4...) já aparece na etiqueta ao lado
  d.setAttribute("aria-hidden", "true");
  return d;
}

function render() {
  const groups = groupize(streams);
  countPill.textContent = String(groups.length);
  streamsEl.textContent = "";

  if (!groups.length) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = t("empty");
    streamsEl.appendChild(d);
    return;
  }

  const pending = [];

  groups.forEach((g) => {
    const row = document.createElement("div");
    row.className = "stream-item";

    const name = (g.best.title || "").trim() || hostOf(g.best.url);
    const meta = document.createElement("div");
    meta.className = "stream-meta";

    const n = document.createElement("div");
    n.className = "stream-name";
    n.textContent = name.slice(0, 70);
    n.title = name;

    const sub = document.createElement("div");
    sub.className = "stream-sub";
    const tag = document.createElement("span");
    tag.className = "stream-tag";
    tag.textContent = g.best.kind + (g.count > 1 ? ` +${g.count - 1}` : "");
    const u = document.createElement("span");
    u.className = "stream-url";
    u.textContent = shortPath(g.best.url);
    u.title = g.best.url;
    sub.append(tag, u);

    meta.append(n, sub);

    const btn = document.createElement("button");
    btn.className = "stream-btn";
    btn.type = "button";
    btn.textContent = t("download");
    btn.setAttribute("aria-label", t("download") + ": " + name.slice(0, 70));
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "…";
      startDownload(g.best.url, "best", g.best.url, () => {
        btn.disabled = false;
        btn.textContent = t("download");
      });
    });

    const thumb = thumbNode(g.best);
    row.append(thumb, meta, btn);
    if (!g.best.thumb) pending.push({ el: thumb, item: g.best });
    streamsEl.appendChild(row);
  });

  loadThumbs(pending);
}

/* miniatura gerada pelo servidor (ffmpeg) quando a página não tem poster/og:image */
async function loadThumbs(pending) {
  if (!serverOnline) return;
  const queue = pending.slice(0, 6);
  const work = async () => {                       // 3 em paralelo (o servidor também limita a 2 ffmpeg)
    while (queue.length) {
      const p = queue.shift();
      if (!p.el || !p.el.isConnected) continue;
      let src = thumbCache.get(p.item.url);
      if (!src) {
        const r = await send({ type: "THUMB", url: p.item.url, referer: currentTab && currentTab.url ? currentTab.url : "" });
        if (!r || !r.ok || !r.data) continue;
        src = r.data;
        thumbCache.set(p.item.url, src);
      }
      if (!p.el.isConnected) continue;
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = src;
      img.alt = "";
      p.el.replaceWith(img);
    }
  };
  await Promise.all([work(), work(), work()]);
}

/* Só redesenha a lista quando algo mudou (evita piscar) */
let lastSig = "";
const sigOf = (l) => l.map((x) => x.url + "|" + (x.thumb ? x.thumb.length : 0) + "|" + (x.title || "")).join("\n");
function applyStreams(list) {
  if (!Array.isArray(list)) return;
  const sg = sigOf(list);
  if (sg === lastSig) return;
  lastSig = sg;
  streams = list;
  render();
}

async function refreshStreams(showSpinner) {
  if (!currentTab || currentTab.id == null) return;
  if (showSpinner) refreshBtn.classList.add("spin");
  try {
    const r = await send({ type: "GET_TAB_STREAMS", tabId: currentTab.id });
    if (r && r.streams) applyStreams(r.streams);
    const rr = await send({ type: "RESCAN_TAB", tabId: currentTab.id });
    if (rr && rr.ok && rr.streams) applyStreams(rr.streams);
  } finally {
    refreshBtn.classList.remove("spin");
  }
}

/* -------------------------------------------------------------- downloads - */
/* Downloads do navegador em andamento — inclusive os iniciados pelo botão sobre o vídeo ou por outra aba
   (antes o popup só enxergava o que ELE mesmo tinha mandado baixar). */
const jobsWrap = $("jobsWrap"), jobsEl = $("jobs");
const ACTIVE_J = new Set(["queued", "downloading", "merging", "stopping"]);
const jobRows = new Map();
const pendingStop = new Set();                 // ids com cancel clicado aguardando o servidor confirmar "stopping"

function jobStage(j) {
  if (j.status === "queued") return t("queuedWait");
  if (j.status === "merging") return t("mergingShort");
  if (j.status === "stopping") return j.live ? t("stoppingSave") : t("canceling");
  if (j.live && j.status === "downloading") {
    const s = Math.max(0, Math.round(Date.now() / 1000 - (j.started || Date.now() / 1000)));
    return t("recordingFor", s >= 60 ? `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s` : `${s}s`);
  }
  const p = String(j.progress || "");
  if (/^\d+(\.\d+)?%$/.test(p)) return t("downloadingP", p + (j.speed ? " • " + j.speed : ""));
  return p || t("downloading0");                        // "convertendo para H.264", "unindo"... vem pronto do servidor
}
function jobName(j) {
  const ttl = String(j.title || "").replace(/^\(\d+\)\s*/, "").trim();
  return (ttl || hostOf(j.url || "") || "download").slice(0, 70);
}

async function pollJobs() {
  let r;
  try { r = await send({ type: "JOBS" }); } catch (_) { r = null; }
  const list = (r && r.ok && r.data && Array.isArray(r.data.jobs) ? r.data.jobs : [])
    .filter((j) => ACTIVE_J.has(j.status) && !j.import_app && !j.batch)
    .sort((a, b) => (a.created || 0) - (b.created || 0));
  jobsWrap.hidden = !list.length;
  if (!list.length) { jobRows.forEach((row) => row.remove()); jobRows.clear(); pendingStop.clear(); return; }
  const seen = new Set();
  list.forEach((j) => {
    seen.add(j.id);
    if (pendingStop.has(j.id)) j.status = "stopping";     // cancel já clicado: não deixa o poll reverter a tela
    let row = jobRows.get(j.id);
    if (!row) {
      row = document.createElement("div");
      row.className = "stream-item job-item";
      // slots persistentes dentro de .j-stage: shimmer/pulse/dots são CSS-animation — nó criado 1x não reinicia a cada paint
      row.innerHTML = `<div class="stream-meta"><div class="stream-name"></div><div class="stream-sub"><span class="j-stage"><span class="j-live" style="display:none"><i></i><span class="j-shim"></span></span><span class="j-txt"></span><span class="j-dots" style="display:none"><i></i><i></i><i></i></span></span></div><div class="j-bar"><i></i></div></div><button type="button" class="stream-btn j-x">✕</button>`;
      row.querySelector(".j-x").addEventListener("click", (e) => {
        if (!e.isTrusted) return;                     // mesmo padrão da pilula: sintético nunca cancela
        const prev = j.status;
        pendingStop.add(j.id);                          // segura "stopping" até o servidor confirmar
        j.status = "stopping";
        paint(row, j);
        send({ type: "CANCEL", jobId: j.id, src: "popup" }).then((r) => {
          if (r && r.ok) return;
          pendingStop.delete(j.id); j.status = prev; paint(row, j);   // falhou: devolve o botão pra tentar de novo
          statusEl.textContent = t("cancelFail");                     // igual à pilula: avisa que não cancelou
        });
      });
      jobRows.set(j.id, row);
    }
    paint(row, j);
    jobsEl.appendChild(row);
  });
  function paint(row, j) {
    row.classList.toggle("live", !!j.live);
    const x = row.querySelector(".j-x");
    if (j.live && j.status !== "queued") { x.textContent = t("stopSave"); x.classList.add("j-stop"); x.title = t("stopSave"); }
    else { x.textContent = "✕"; x.classList.remove("j-stop"); x.title = t("cancel"); }
    const stopping = j.status === "stopping" || (j.live && j.status === "merging");   // merging em live = resgate: cancelar mataria o salvamento
    x.style.pointerEvents = stopping ? "none" : "";
    x.style.opacity = stopping ? ".45" : "";
    x.disabled = stopping;                              // pointerEvents não cobre teclado
    row.querySelector(".stream-name").textContent = jobName(j);
    const st = row.querySelector(".j-stage");
    const txt = st.querySelector(".j-txt"), line = jobStage(j);
    if (j.status === "stopping") {                      // shimmer no "parando e salvando" + pontinhos do processo
      txt.classList.add("j-shim");
      if (txt.textContent !== line) { txt.textContent = line; txt.dataset.text = line; }
      st.querySelector(".j-dots").style.display = "";
    } else {
      if (txt.classList.contains("j-shim")) { txt.classList.remove("j-shim"); delete txt.dataset.text; }
      if (txt.textContent !== line) txt.textContent = line;
      st.querySelector(".j-dots").style.display = "none";
    }
    const b = st.querySelector(".j-live");              // selo ● AO VIVO antes do "gravando há Xmin" — nó fixo: shimmer contínuo
    b.style.display = j.live ? "" : "none";
    if (j.live) {
      const sh2 = b.querySelector(".j-shim"), lb = t("liveBadge");
      if (sh2.textContent !== lb) { sh2.textContent = lb; sh2.dataset.text = lb; }
    }
    const pct = j.live ? NaN : parseFloat(j.progress);    // live: barra de % não faz sentido
    const bar = row.querySelector(".j-bar");
    bar.style.display = isFinite(pct) ? "" : "none";
    if (isFinite(pct)) bar.firstElementChild.style.width = Math.min(100, pct) + "%";
  }
  for (const [id, row] of jobRows) if (!seen.has(id)) { row.remove(); jobRows.delete(id); pendingStop.delete(id); }
}

function setJob(jobId) {
  currentJob = jobId;
  cancelBtn.hidden = !jobId;
  barWrap.hidden = !jobId;
  if (!jobId) bar.style.width = "0";
}

function track(jobId, onDone) {
  const started = Date.now();
  setJob(jobId);
  let ended = false;
  const timer = setInterval(async () => {
    const end = (ok) => {
      if (ended) return;
      ended = true;
      clearInterval(timer);
      if (currentJob === jobId) setJob(null);
      onDone && onDone(ok);
    };
    const st = await send({ type: "STATUS", jobId });
    if (!st || !st.ok) {
      if (Date.now() - started > 8000) {
        statusEl.textContent = t("lost");
        end(false);
      }
      return;
    }
    const d = st.data || {};
    const pct = parseFloat(d.progress);
    if (currentJob === jobId && isFinite(pct)) bar.style.width = Math.min(100, pct) + "%";
    if (d.status === "queued") statusEl.textContent = t("queue");
    else if (d.status === "downloading") statusEl.textContent = d.progress ? t("downloading", d.progress) : t("extracting");
    else if (d.status === "merging") statusEl.textContent = t("merging");
    else if (d.status === "stopping") statusEl.textContent = t(d.live ? "stoppingSave" : "canceling") + "…";
    else if (d.status === "done") {
      statusEl.textContent = t("savedIn", prettyFolder(d.output_dir || (cfg && cfg.output_dir))) + (d.warning ? " — " + t("ffWarn") : "");
      end(true);
    } else if (d.status === "canceled") {
      statusEl.textContent = t("canceledMsg");
      end(false);
    } else if (d.status === "error") {
      statusEl.textContent = t("errX", String(d.error || "-").slice(0, 70));
      end(false);
    }
  }, 700);
}

function resolvePopupTarget(targetUrl, fallbackStream) {
  let url = (targetUrl || "").trim();
  if (/^https?:\/\/(?:www\.)?linkedin\.com\/feed\/?(?:[?#]|$)/i.test(url)) {
    const posts = streams.filter(x => x.kind === "LinkedIn");
    const playing = posts.filter(x => x.pri === 2);
    const candidates = playing.length ? playing : posts;
    if (candidates.length !== 1) {
      statusEl.textContent = /^pt/i.test(navigator.language) ? "Escolha um vídeo da lista ou use o botão sobre o vídeo no feed." : "Choose a video from the list or use the button over the feed video.";
      return null;
    }
    url = candidates[0].url;
    fallbackStream = candidates[0].fallbackStream || "";
  }
  return {url, fallbackStream};
}
async function startDownload(targetUrl, quality, fallbackStream, onDone, sendTo) {
  const resolved = resolvePopupTarget(targetUrl, fallbackStream);
  if (!resolved) { onDone && onDone(false); return; }
  const url = resolved.url;
  fallbackStream = resolved.fallbackStream;
  if (!/^https?:/i.test(url)) {
    statusEl.textContent = t("openPage");
    onDone && onDone(false);
    return;
  }
  statusEl.textContent = t("starting");
  let live = false;
  try {                                            // a aba sabe se a página é uma transmissão ao vivo
    if (currentTab && currentTab.id != null && /^https?:/i.test(currentTab.url || "")) {
      const r = await chrome.tabs.sendMessage(currentTab.id, { type: "IS_LIVE" }, { frameId: 0 });
      live = !!(r && r.live);
    }
  } catch (_) {}
  const res = await send({
    type: "DOWNLOAD",
    url,
    fallbackStream: fallbackStream && fallbackStream !== url ? fallbackStream : "",
    referer: (currentTab && currentTab.url) || url,
    title: (currentTab && currentTab.title) || "",
    pageUrl: (currentTab && currentTab.url) || url,
    quality: quality || "best",
    target: sendTo || "",
    live
    ,linkedinManifest: streams.find(x => x.url === url)?.linkedinManifest
  });

  if (!res || !res.ok || !res.job_id) {
    statusEl.textContent = res && res.error === "forbidden" ? t("forbiddenMsg")
      : res && res.error && res.error !== "Servidor local offline" ? String(res.error).slice(0, sendTo ? 160 : 70)
      : t("startFail");
    const keep = statusEl.textContent;
    await checkHealth();
    if (serverOnline) statusEl.textContent = keep;      // o aviso do erro vale mais que o "online"
    onDone && onDone(false);
    return;
  }
  if (res.duplicate) statusEl.textContent = t("dupNote");
  else if (sendTo) statusEl.textContent = t("sentProject", prettyFolder(res.output_dir));
  track(res.job_id, onDone);
}

async function downloadAll() {
  const groups = groupize(streams);
  const urls = groups.map((g) => g.best.url).slice(0, 20);
  const host = (() => {
    try { return new URL((currentTab && currentTab.url) || "").hostname; } catch (_) { return ""; }
  })();
  const playerPage = /(^|\.)youtube\.com$|vimeo\.com|globoplay|globo\.com|dailymotion|twitch/.test(host);
  if (playerPage || (!urls.length && currentTab && currentTab.url && currentTab.url.startsWith("http"))) {
    urls.unshift(currentTab.url);
  }

  const res = await send({
    type: "DOWNLOAD_MANY",
    urls,
    referer: (currentTab && currentTab.url) || "",
    title: (currentTab && currentTab.title) || "",
    quality: "best"
  });

  if (!res || !res.ok) {
    statusEl.textContent = t("enqueueFail");
    await checkHealth();
    return;
  }
  statusEl.textContent = res.queued ? t("queuedN", res.queued) : t("nothing");
}

/* ---------------------------------------------------------------- atualizar -- */
/* A extensão em modo desenvolvedor não se atualiza sozinha: quem baixa e troca os arquivos é o servidor local (confere o SHA-256);
   aqui só se pergunta, se confirma e se recarrega a extensão quando o servidor novo sobe. */
const updRow = $("updRow"), updMsg = $("updMsg"), updBtn = $("updBtn");
let updInfo = null, updBusy = false;

// 1.2.3 -> [1,2,3]; > 0 quando a é mais nova que b
function verCmp(a, b) {
  const x = String(a || "").split(".").map(Number), y = String(b || "").split(".").map(Number);
  for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}
const extVersion = chrome.runtime.getManifest().version;

// mode "reload": o app local JÁ foi atualizado (por este ou por outro perfil do navegador) e esta extensão ainda é a antiga
function showUpd(msg, canApply, mode) {
  updRow.hidden = false;
  updMsg.textContent = msg;
  updBtn.hidden = !canApply;
  updBtn.dataset.mode = mode || "apply";
  if (canApply) updBtn.textContent = mode === "reload" ? t("updReload") : t("updApply");
}
function showReloadIfBehind(serverVer) {
  if (verCmp(serverVer, extVersion) > 0) { showUpd(t("updReloadMsg", serverVer, extVersion), true, "reload"); return true; }
  return false;
}

async function checkUpdate(manual) {
  if (updBusy) return;
  if (manual) showUpd(t("updChecking"), false);
  const r = await send({ type: "UPDATE_CHECK", force: !!manual });
  if (!r || !r.ok) { if (manual) showUpd(r && r.error ? r.error : t("updFail"), false); return; }
  updInfo = r;
  if (showReloadIfBehind(r.current)) return;
  if (r.newer) {
    showUpd(t("updNew", r.latest) + (!r.can_apply && r.reason ? " — " + r.reason : ""), r.can_apply);
  } else if (manual) {
    showUpd(t("updLatest", r.current), false);
    setTimeout(() => { if (!updBusy && updInfo && !updInfo.newer) updRow.hidden = true; }, 5000);
  }
}

async function applyUpdate() {
  if (updBtn.dataset.mode === "reload") { chrome.runtime.reload(); return; }
  if (updBusy || !updInfo || !updInfo.newer) return;
  if (!confirm(t("updConfirm", updInfo.latest))) return;
  updBusy = true;
  showUpd(t("updApplying"), false);
  const r = await send({ type: "UPDATE_APPLY" });
  if (!r || !r.ok) { updBusy = false; showUpd(r && r.error ? r.error : t("updFail"), updInfo.can_apply); return; }
  showUpd(t("updRestarting"), false);
  for (let i = 0; i < 40; i++) {                      // espera o servidor novo subir (a versão do /health muda)
    await new Promise((x) => setTimeout(x, 1000));
    const h = await send({ type: "HEALTH" });
    if (h && h.ok && h.data && h.data.version === r.version) break;
  }
  chrome.runtime.reload();
}

if (verEl) verEl.addEventListener("click", () => checkUpdate(true));
if (updBtn) updBtn.addEventListener("click", applyUpdate);

/* ------------------------------------------------------------------ boot -- */
async function boot() {
  urlInput.setAttribute("aria-label", t("urlPh"));
  // config, aba ativa e saúde do servidor ao mesmo tempo (antes eram 4 esperas em fila)
  const [tabs] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    loadConfig(true),
    checkHealth()
  ]);
  currentTab = tabs[0] || null;
  if (serverOnline && !showReloadIfBehind(srvVersion)) checkUpdate(false);      // em silêncio: só aparece a faixa se houver versão nova
  const u = (currentTab && currentTab.url) || "";
  if (u.startsWith("http")) urlInput.value = u;

  if (currentTab && currentTab.id != null) {
    const r = await send({ type: "GET_TAB_STREAMS", tabId: currentTab.id });
    if (r && r.streams && r.streams.length) applyStreams(r.streams);
  }
  refreshStreams(false);

  // segunda chance: a página pode publicar os streams logo depois que o popup abre
  setTimeout(async () => {
    if (streams.length || !currentTab || currentTab.id == null) return;
    const r = await send({ type: "GET_TAB_STREAMS", tabId: currentTab.id });
    if (r && r.streams && r.streams.length) applyStreams(r.streams);
  }, 800);

  setInterval(() => { if (!document.hidden) checkHealth(); }, 2500);
  pollJobs();
  setInterval(() => { if (!document.hidden) pollJobs(); }, 1100);   // downloads do navegador em andamento (lista com cancelar)

  // atualização automática enquanto o popup está aberto: a página troca de vídeo, o player carrega depois, etc.
  let urlEdited = false;
  urlInput.addEventListener("input", () => { urlEdited = true; });
  setInterval(async () => {
    if (document.hidden || !currentTab || currentTab.id == null) return;
    try {
      const [tb] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tb && tb.id === currentTab.id && tb.url && tb.url !== currentTab.url) {
        currentTab = tb;
        if (!urlEdited && tb.url.startsWith("http")) urlInput.value = tb.url;
      }
      const rr = await send({ type: "RESCAN_TAB", tabId: currentTab.id });
      if (rr && rr.ok && rr.streams) applyStreams(rr.streams);
    } catch (_) {}
  }, 1800);
}

refreshBtn.addEventListener("click", async (e) => {
  if (e.shiftKey && currentTab && currentTab.id != null) {
    await chrome.tabs.reload(currentTab.id);
    window.close();
    return;
  }
  await refreshStreams(true);
  await loadConfig(true);
});

settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
changeFolderBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
setupBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

$("compatBox").addEventListener("change", async (e) => {
  const on = e.target.checked;
  const r = await send({ type: "SAVE_CONFIG", patch: { compat_h264: on } });
  if (r && r.ok && r.config) {
    applyConfig(r.config);
    statusEl.textContent = on ? t("compatOnMsg") : t("compatOffMsg");
  } else {
    e.target.checked = !on;
    statusEl.textContent = t("saveFailMsg");
  }
});

fabBtn.addEventListener("click", async () => {
  const turningOn = !(cfg && cfg.fab_enabled !== false);
  const r = await send({ type: "SAVE_CONFIG", patch: { fab_enabled: turningOn } });
  if (r && r.ok && r.config) {
    applyConfig(r.config);
    statusEl.textContent = turningOn ? t("iconOnMsg") : t("iconOffMsg");
  } else {
    statusEl.textContent = t("saveFailMsg");
  }
});

openFolderBtn.addEventListener("click", async () => {
  const r = await send({ type: "OPEN_FOLDER", path: (cfg && cfg.output_dir) || "" });
  if (!r || !r.ok) statusEl.textContent = t("openFolderFail");
});

async function openCollection(seed) {
  const r = await send({type:"OPEN_COLLECTION",seed});
  if(r && r.ok) window.close();
}
allBtn.addEventListener("click", () => openCollection({items:groupize(streams).map(g=>({url:g.best.url,title:g.best.title||"",referer:currentTab&&currentTab.url||""})),quality:$("quickQuality").value}));

cancelBtn.addEventListener("click", async (e) => {
  if (!e.isTrusted || !currentJob) return;
  const r = await send({ type: "CANCEL", jobId: currentJob, src: "popup" });
  statusEl.textContent = r && r.ok ? t("canceledMsg") : t("cancelFail");
});

document.querySelectorAll("button[data-q]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const quality = $("quickQuality").value;
    const target = (urlInput.value || (currentTab && currentTab.url) || "").trim();
    const bestStream = streams[0] ? streams[0].url : "";
    if(NVFCollection.playlistUrl(target,false)) openCollection({url:target,quality});
    else startDownload(target, quality, bestStream);
  });
});

// edição "for Editors": envio para o Premiere/After Effects (Windows e Mac) e conversão H.264; o Noe VFX Downloader não mostra os destinos Adobe
const EDITORS = globalThis.NVF_EDITION !== "basic";
if (EDITORS && /Windows|Macintosh|Mac OS X/i.test(navigator.userAgent)) $("sendRow").hidden = false;
if (!EDITORS) { const cr = $("compatRow"); if (cr) cr.hidden = true; }
if (EDITORS) $("edPill").hidden = false;
$("batchBtn").addEventListener("click", () => openCollection({}));
$("audioBtn").addEventListener("click",()=>{const resolved=resolvePopupTarget(urlInput.value||(currentTab&&currentTab.url)||"",streams[0]?streams[0].url:"");if(!resolved)return;const {url,fallbackStream}=resolved;openCollection({items:NVFCollection.playlistUrl(url,false)?undefined:[{url,title:currentTab&&currentTab.title||"",fallbackStream,linkedinManifest:streams.find(it=>it.url===url)?.linkedinManifest,referer:currentTab&&currentTab.url||url}],url:NVFCollection.playlistUrl(url,false)?url:undefined,media:"audio"});});
$("playlistBtn").addEventListener("click",()=>{const url=(urlInput.value||(currentTab&&currentTab.url)||"").trim();openCollection({url:NVFCollection.playlistUrl(url,true),quality:$("quickQuality").value});});
setInterval(()=>{$("playlistBtn").hidden=!NVFCollection.playlistUrl((urlInput.value||(currentTab&&currentTab.url)||"").trim(),true);},500);
document.querySelectorAll("button[data-target]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (urlInput.value || (currentTab && currentTab.url) || "").trim();
    const bestStream = streams[0] ? streams[0].url : "";
    startDownload(target, $("quickQuality").value, bestStream, null, btn.dataset.target);
  });
});

urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if(NVFCollection.playlistUrl(urlInput.value,false)||NVFCollection.extractLinks(urlInput.value).length>1) openCollection({url:urlInput.value});
    else startDownload(urlInput.value, $("quickQuality").value, streams[0] ? streams[0].url : "");
  }
});

chrome.storage.onChanged.addListener((ch, area) => {
  if (area === "local" && ch.cfg) applyConfig(ch.cfg.newValue);
});

// accordion (transitions.dev): as seções "Em andamento" e "Detectados" recolhem/expandem
document.querySelectorAll(".t-acc-head").forEach((h) => {
  h.addEventListener("click", () => {
    const acc = h.closest(".t-acc");
    if (!acc) return;
    const open = acc.getAttribute("data-open") === "true";
    acc.setAttribute("data-open", String(!open));
    h.setAttribute("aria-expanded", String(!open));
  });
});

boot();
