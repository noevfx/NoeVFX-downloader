/* ============================================================================
   Noe VFX Downloader — Content Script v3.2.2  (noevfx.com)
   - Ícone flutuante sobre QUALQUER <video> (Shadow DOM, sem conflito)
   - Arrastável dentro da área do vídeo (posição salva por site)
   - Some sozinho após 2 s com o mouse parado
   - Liga/desliga pelo cartão do vídeo, pelo popup ou pelo botão direito
   ========================================================================== */
(() => {
  "use strict";
  if (window.__noevfxV3) return;
  window.__noevfxV3 = true;

  const t = (k, ...s) => (globalThis.__nvfT ? globalThis.__nvfT(k, ...s) : k);

  const BRAND_SVG = `<svg viewBox="0 0 722.36 722.36" width="20" height="20" aria-hidden="true">
    <rect fill="#0066FF" width="722.36" height="722.36" rx="102.3" ry="102.3"/>
    <path fill="#FFFFFF" d="M550.64,561.37H168.59c-4.19,0-7.59-3.4-7.59-7.59V171.73l389.63,389.63ZM553.77,161H171.72l389.63,389.63V168.58c0-4.17-3.39-7.59-7.59-7.59Z"/>
  </svg>`;

  const FAB_SIZE = 40;

  const STYLE = `
    :host {
      all: initial;
      /* ---- transitions.dev motion tokens — um lugar só pra afinar toda a motion da pilula ---- */
      --toast-open: 350ms; --toast-close: 250ms; --toast-distance: 16px; --toast-blur: 2px; --toast-scale: .97;
      --toast-ease: cubic-bezier(.22,1,.36,1);
      --morph-open-dur: 250ms; --morph-close-dur: 150ms; --morph-ease: cubic-bezier(.22,1,.36,1);
      --morph-close-ease: cubic-bezier(.22,1,.36,1); --morph-fade-dur: 200ms; --morph-blur: 2px; --morph-scale: .97;
      --acc-expand: 250ms; --acc-collapse: 250ms; --acc-chevron: 250ms; --acc-ease: cubic-bezier(.22,1,.36,1);
      --stack-open: 350ms; --stack-close: 250ms; --stack-ease: cubic-bezier(.22,1,.36,1);
      --stack-rise: 60px; --stack-blur: 2px; --stack-scale: .97; --stack-peek: 12px; --stack-spread-gap: 12px;
      --stack-depth-scale: .06; --stack-depth-fade: .4; --stack-depth1-blur: 1px; --stack-depth2-blur: 2px;
      --shimmer-dur: 2000ms; --shimmer-ease: linear; --shimmer-band: 400%;
      --shimmer-base: rgba(255,255,255,.78); --shimmer-highlight: #fff;
      --check-dur: 500ms; --check-path-delay: 80ms; --check-blur-from: 10px; --check-y-amount: 40px; --check-rotate-from: 80deg;
      --check-ease-out: cubic-bezier(.22,1,.36,1); --check-ease-bob: cubic-bezier(.34,1.35,.64,1);
      --shake-dur: 280ms; --shake-distance: 6px; --shake-overshoot: 4px; --shake-ease: cubic-bezier(.22,1,.36,1);
    }
    * { box-sizing: border-box; font-family: "Segoe UI", Roboto, system-ui, -apple-system, sans-serif; }
    .fab {
      position: fixed; z-index: 2147483647; display: none;
      width: 40px; height: 40px; padding: 0; border: 1px solid rgba(0,102,255,.65);
      border-radius: 12px; background: rgba(10,12,18,.86);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 6px 20px rgba(0,0,0,.45);
      align-items: center; justify-content: center; cursor: grab;
      touch-action: none; user-select: none;
      transition: background .12s ease, border-color .12s ease,
                  opacity var(--morph-fade-dur) var(--morph-close-ease), scale var(--morph-close-dur) var(--morph-close-ease), filter var(--morph-fade-dur) ease;
    }
    .fab.morphed { opacity: 0; scale: .8; filter: blur(var(--morph-blur)); pointer-events: none; }   /* o botão "virou" o painel */
    .fab:hover { background: #0066FF; border-color: #4d94ff; }
    :is(button, select, [role="button"]):focus-visible { outline:2px solid #9bc5ff; outline-offset:2px; }
    .fab svg { width: 22px; height: 22px; display: block; pointer-events: none; }
    .panel {
      position: fixed; z-index: 2147483647; width: min(268px, calc(100vw - 16px));
      box-sizing:border-box; max-height:calc(100dvh - 16px); overflow-y:auto; overscroll-behavior:contain;
      padding: 10px; border-radius: 14px; border: 1px solid rgba(0,102,255,.35);
      background: rgba(15,17,23,.97); color: #f3f4f8;
      box-shadow: 0 14px 40px rgba(0,0,0,.6);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      font-size: 12px; line-height: 1.35;
      /* transitions.dev "plus→menu morph": o painel cresce a partir do FAB — o transform-origin
         é calculado em JS pro canto do botão (o box morfa do gatilho, não só aparece ao lado) */
      transform-origin: 100% 50%;
      /* transitions.dev "menu dropdown": popover cresce do gatilho — scale .97→1, abre 250ms,
         fecha 150ms, sem blur nem slide (o efeito vem do transform-origin, não de exagero) */
      opacity: 0; scale: var(--morph-scale);
      visibility: hidden; pointer-events: none;
      transition: opacity var(--morph-close-dur) var(--morph-close-ease), scale var(--morph-close-dur) var(--morph-close-ease),
                  visibility 0s linear var(--morph-close-dur);
    }
    .panel.is-open {
      opacity: 1; scale: 1;
      visibility: visible; pointer-events: auto;
      transition: opacity var(--morph-open-dur) var(--morph-ease), scale var(--morph-open-dur) var(--morph-ease),
                  visibility 0s linear 0s;
    }
    .panel .head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
    .panel .head b { font-size: 12.5px; font-weight: 700; letter-spacing:.2px; }
    .panel .head span.brand { color:#4d94ff; font-size:10px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; }
    .panel .head .x { all:unset; margin-left:auto; cursor:pointer; flex-shrink:0; width:22px; height:22px;
      display:flex; align-items:center; justify-content:center; border-radius:6px;
      font-size:14px; font-weight:800; line-height:1; color:#8d98ae; }
    .panel .head .x:hover { background:rgba(255,255,255,.12); color:#fff; }
    .panel .dest {
      display:flex; align-items:center; gap:6px; padding:6px 8px; margin-bottom:8px;
      border-radius:8px; background: rgba(0,102,255,.12); border:1px solid rgba(0,102,255,.22);
      font-size:10.5px; color:#c9d3e8;
    }
    .panel .dest .path { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; text-align:left; }
    .panel .dest button {
      all: unset; cursor:pointer; color:#7fb0ff; font-size:10.5px; font-weight:700; white-space:nowrap;
    }
    .panel .grid { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
    .panel .grid .audio-choice { grid-column:1 / -1; }
    .panel button.opt {
      all: unset; display:flex; align-items:center; justify-content:center; gap:6px;
      padding:8px 6px; border-radius:9px; cursor:pointer; font-size:11.5px; font-weight:600;
      background:#1b2030; color:#eef2fb; border:1px solid #2a3348; text-align:center;
    }
    .panel button.opt:hover { background:#0066FF; border-color:#0066FF; color:#fff; }
    .panel button.opt.main { grid-column: span 2; background:#0066FF; border-color:#0066FF; color:#fff; font-size:12.5px; }
    .panel button.opt.main:hover { background:#0052cc; }
    .panel .all { margin-top:8px; }
    .panel .all button {
      all: unset; display:block; width:100%; text-align:center; cursor:pointer;
      padding:7px; border-radius:9px; font-size:11px; font-weight:700;
      color:#9fc0ff; border:1px dashed rgba(0,102,255,.45);
    }
    .panel .all button:hover { background: rgba(0,102,255,.16); }
    .panel .send-h { margin-top:9px; font-size:9.5px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:#8d98ae; }
    .panel .send { display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-top:5px; }
    .panel .send button {
      all: unset; box-sizing:border-box; min-width:0; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;
      padding:7px 6px; border-radius:9px; font-size:11.5px; font-weight:700; white-space:nowrap; overflow:hidden;
    }
    .panel button.all-btn, .panel select { box-sizing:border-box; max-width:100%; }
    .panel .send button span { overflow:hidden; text-overflow:ellipsis; }
    .panel .send b { flex-shrink:0; font-size:9.5px; font-weight:800; line-height:1; padding:3px 4px; border-radius:4px; }
    .panel .send button.pr { background:#2a1248; color:#e3ccff; border:1px solid #7b3fe0; }
    .panel .send button.pr b { background:#9a5cff; color:#1a0833; }
    .panel .send button.pr:hover { background:#3b1a66; border-color:#a678ff; }
    .panel .send button.ae { background:#16194d; color:#d3d6ff; border:1px solid #4b55e0; }
    .panel .send button.ae b { background:#7d86ff; color:#0c0e33; }
    .panel .send button.ae:hover { background:#21266b; border-color:#8a92ff; }
    .panel .compat {
      display:flex; align-items:center; gap:7px; margin-top:9px; font-size:10.5px; color:#b3bdd1; cursor:pointer; user-select:none;
    }
    .panel .compat input { width:14px; height:14px; margin:0; accent-color:#0066ff; cursor:pointer; }
    .panel .compat:hover { color:#fff; }
    .panel .foot {
      display:flex; align-items:center; justify-content:space-between; gap:8px;
      margin-top:9px; padding-top:8px; border-top:1px solid rgba(255,255,255,.08);
      font-size:10px; color:#8d98ae;
    }
    .panel .foot .hint { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .panel button.tgl {
      all: unset; cursor:pointer; padding:3px 8px; border-radius:7px; font-size:9.5px;
      font-weight:800; letter-spacing:.5px; white-space:nowrap;
      background: rgba(0,102,255,.18); color:#7fb0ff; border:1px solid rgba(0,102,255,.4);
    }
    .panel button.tgl.off { background: rgba(255,255,255,.06); color:#8892a8; border-color: rgba(255,255,255,.14); }
    .toast {
      position: fixed; z-index: 2147483647; left: 50%; bottom: 26px; transform: translateX(-50%);
      max-width: min(540px, 92vw); padding:11px 17px; border-radius: 999px;
      background: #013fff; color:#fff; font-size:14px; font-weight:600;
      box-shadow:0 10px 30px rgba(0,0,0,.55);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      touch-action: none;                          /* em telas de toque o dedo arrasta a pilula, não rola a página */
      /* transitions.dev "toast": surgir = rise + cross-blur + scale (abre no clock lento, fecha no rápido).
         translate/scale são propriedades próprias — o transform do centro/arrasto não disputa com eles. */
      opacity: 0; translate: 0 var(--toast-distance); scale: var(--toast-scale); filter: blur(var(--toast-blur));
      visibility: hidden; pointer-events: none;
      /* border-radius+padding na transição: cápsula ↔ card de jobs morfa, não corta seco */
      transition: opacity var(--toast-close) var(--toast-ease), translate var(--toast-close) var(--toast-ease),
                  scale var(--toast-close) var(--toast-ease), filter var(--toast-close) var(--toast-ease),
                  border-radius var(--toast-close) var(--toast-ease), padding var(--toast-close) var(--toast-ease),
                  visibility 0s linear var(--toast-close);
    }
    .toast.is-open {
      opacity: 1; translate: 0 0; scale: 1; filter: blur(0);
      visibility: visible; pointer-events: auto;
      transition: opacity var(--toast-open) var(--toast-ease), translate var(--toast-open) var(--toast-ease),
                  scale var(--toast-open) var(--toast-ease), filter var(--toast-open) var(--toast-ease),
                  border-radius var(--toast-open) var(--toast-ease), padding var(--toast-open) var(--toast-ease),
                  visibility 0s linear 0s;
    }
    .toast.err { border-color: rgba(255,120,120,.95); }
    .toast.ok { border-color: rgba(120,255,190,.8); }
    .toast.jobs { cursor:grab; }
    .toast .j-sum { display:flex; align-items:center; gap:9px; cursor:pointer; user-select:none;
      margin:-5px -8px; padding:5px 8px; border-radius:10px; }
    .toast .j-sum:hover { background: rgba(255,255,255,.14); }
    .toast .j-caret { font-size:10px; opacity:.95; transition: transform var(--acc-chevron) var(--acc-ease); flex-shrink:0; line-height:1;
      border:1px solid rgba(255,255,255,.6); border-radius:6px; padding:4px 6px; background:rgba(255,255,255,.1); }
    .toast.spread .j-caret { transform: rotate(180deg); }
    .toast .j-sumtxt { flex:1; min-width:0; display:flex; align-items:center; }
    .toast .j-sumt { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .toast .j-dot { flex-shrink:0; width:8px; height:8px; border-radius:50%; background:#ff404f;
      margin-right:7px; animation:nvl-pulse 1.1s ease-in-out infinite; }
    .toast .j-list { display:none; margin-top:9px; flex-direction:column; gap:8px; max-height:230px; overflow-y:auto; touch-action: pan-y;
      transition: margin-top var(--stack-open) var(--stack-ease); }
    .toast.open .j-list { display:flex; }
    .toast .j-row { display:flex; align-items:center; gap:8px; font-size:13px;
      background:#2a5cff; border:1px solid rgba(255,255,255,.18); border-radius:12px; padding:7px 10px;
      filter:blur(0); transform-origin:50% 100%;
      transition: transform var(--stack-open) var(--stack-ease), opacity var(--stack-open) var(--stack-ease), filter var(--stack-open) var(--stack-ease); }
    .toast .j-cell { flex:1; min-width:0; }
    .toast .j-name { font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .toast .j-stage { font-size:12px; opacity:.92; margin-top:1px; display:flex; align-items:center; gap:5px; }
    .toast .j-live { display:inline-flex; align-items:center; gap:4px; flex-shrink:0; color:#ff404f;
      font-weight:800; font-size:10.5px; letter-spacing:.4px; }
    .toast .j-live i { width:7px; height:7px; border-radius:50%; background:#ff404f;
      animation:nvl-pulse 1.1s ease-in-out infinite; }
    @keyframes nvl-pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.65); } }
    .toast .j-dots { display:inline-flex; gap:3px; align-items:center; margin-left:2px; }
    .toast .j-dots i { width:4px; height:4px; border-radius:50%; background:#fff; opacity:.25; animation:nvdots 1.2s ease-in-out infinite; }
    .toast .j-dots i:nth-child(2) { animation-delay:.18s; }
    .toast .j-dots i:nth-child(3) { animation-delay:.36s; }
    @keyframes nvdots { 0%,60%,100% { opacity:.25; transform:translateY(0); } 30% { opacity:1; transform:translateY(-2px); } }
    .toast .j-bar { height:4px; margin-top:5px; background:rgba(255,255,255,.28); border-radius:4px; overflow:hidden; }
    .toast .j-bar i { display:block; height:100%; width:0; background:#fff; transition:width .4s ease; }
    .toast .j-x { all:unset; cursor:pointer; flex-shrink:0; font-size:13px; font-weight:800; line-height:1;
      padding:4px 8px; border-radius:7px; color:#fff; }
    .toast .j-x:hover { background:rgba(255,255,255,.22); }
    .toast .j-stop { all:unset; cursor:pointer; flex-shrink:0; font-size:12px; font-weight:800; line-height:1;
      padding:7px 10px; border-radius:7px; background:#fff; color:#c01818; white-space:nowrap; }
    .toast .j-stop:hover { background:rgba(255,255,255,.82); }
    .toast .j-note { font-size:12.5px; opacity:1; margin-top:8px; display:none; }

    /* O fundo da frente pertence ao mesmo elemento desde o primeiro aviso. */
    .toast, .toast.jobs {
      box-sizing:border-box; width:min(460px, calc(100vw - 24px)); min-width:0;
      height:64px; padding:0 24px; border:0; border-radius:999px; background:#013fff;
      display:flex; align-items:center; gap:8px; overflow:visible;
    }
    .toast.jobs { padding:0; isolation:isolate; }
    .toast.refresh { width:fit-content; max-width:min(640px, calc(100vw - 24px)); height:auto;
      min-height:64px; padding:14px 26px; white-space:normal; }
    .toast.refresh .toast-message { max-width:100%; }
    .toast.refresh .toast-message-text { white-space:normal; overflow:visible; text-overflow:clip; overflow-wrap:anywhere; }
    .toast.jobs .j-row.retiring { pointer-events:none; animation:nvl-card-out var(--stack-close) var(--stack-ease) both; }
    @keyframes nvl-card-out { to { scale:.88; opacity:0; } }
    .toast:not(.jobs), .toast.jobs .j-note.on { justify-content:center; text-align:center; }
    .toast-message { position:relative; display:block; min-width:0; max-width:calc(100% - 44px);
      animation:nvl-content-in var(--stack-open) var(--stack-ease); }
    .toast-message-text { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; line-height:20px; }
    .toast-message .t-check { position:absolute; right:100%; top:2.5px; margin-right:6px; }
    .toast .j-txt { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    @media(prefers-reduced-motion:reduce) { .toast-message { animation:none; } }
    .toast.jobs .j-list { display:contents; }
    .toast.jobs .j-row {
      position:absolute; inset:0; box-sizing:border-box; height:100%; padding:8px 24px;
      background:#013fff; border:0; border-radius:999px; overflow:hidden; color:white;
      transition:transform var(--stack-open) var(--stack-ease),opacity var(--stack-close) var(--stack-ease);
    }
    .toast.jobs .j-row[data-depth="0"] { z-index:2; }
    .toast.jobs .j-row:not([data-depth="0"]) { opacity:0; pointer-events:none; transform:scale(.97); }
    .toast.jobs.spread .j-row:not([data-depth="0"]) {
      opacity:1; pointer-events:auto; transform:translateY(calc(var(--layer) * (-100% - var(--stack-spread-gap))));
    }
    .toast.jobs .j-row { display:grid; grid-template-columns:minmax(0,1fr) auto 28px;
      column-gap:10px; padding-inline:24px 16px; }
    .toast.jobs .j-cell { grid-column:1; grid-row:1; }
    .toast.jobs .j-stop { grid-column:2; grid-row:1; }
    .toast.jobs .j-x:not(.j-stop), .toast.jobs .j-sum { grid-column:3; grid-row:1; }
    .toast.jobs:has([data-depth="1"]) [data-depth="0"] .j-x:not(.j-stop) { grid-column:2; }
    .toast.jobs .j-sum:focus-visible { outline:0; }
    .toast.jobs .j-sum:focus-visible .j-caret { filter:drop-shadow(0 1px 2px #001847); }
    .toast.jobs .j-name { line-height:16px; }
    .toast.jobs .j-stage { line-height:15px; margin-top:2px; opacity:1; }
    .toast.jobs .j-bar { height:4px; margin-top:7px; }
    .toast.jobs .j-sum { flex:0 0 28px; box-sizing:border-box; height:28px; margin:0; padding:0;
      justify-content:center; background:transparent; }
    .toast.jobs:has(.j-row[data-depth="1"]) .j-row[data-depth="0"] { padding-right:16px; }
    .toast.jobs .j-x:not(.j-stop) { box-sizing:border-box; width:28px; padding-inline:0; text-align:center; }
    .toast.jobs .j-caret { display:block; width:15px; height:15px; border:0; background:none; padding:0; }
    .toast.jobs .j-sumtxt { display:none; }
    .toast.jobs .j-stop { border-radius:999px; padding:7px 10px; }
    .toast.jobs .j-note.on { position:absolute; inset:0; z-index:5; box-sizing:border-box; margin:0;
      padding:0 16px; border-radius:inherit; background:#013fff; pointer-events:auto; }
    @keyframes nvl-content-in { from {opacity:0; translate:0 4px} to {opacity:1; translate:0 0} }
    .toast.jobs .j-row.is-enter .j-cell, .toast.jobs .j-note.on { animation:nvl-content-in var(--stack-open) var(--stack-ease); }
    @media(prefers-reduced-motion:reduce) { .toast.jobs * { animation:none!important; transition:none!important; } }

    /* ---- transitions.dev "shimmer text": AO VIVO e "parando e salvando" vivos sem spinner ---- */
    .j-shim { position: relative; display: inline-block; color: var(--shimmer-base); }
    .j-shim::before {
      content: attr(data-text); position: absolute; inset: 0; pointer-events: none;
      background-image: linear-gradient(90deg, transparent 0%, transparent 40%, var(--shimmer-highlight) 50%, transparent 60%, transparent 100%);
      background-size: var(--shimmer-band) 100%; background-repeat: no-repeat;
      background-clip: text; -webkit-background-clip: text;
      color: transparent; -webkit-text-fill-color: transparent;
      animation: nv-shim var(--shimmer-dur) var(--shimmer-ease) infinite;
    }
    .j-live .j-shim { --shimmer-base: #ff404f; }
    @keyframes nv-shim { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

    /* ---- transitions.dev "success check": o ✓ aparece desenhando quando o download fecha ---- */
    .t-check { display:inline-block; margin-right:7px; color:#7dffb0; opacity:0; transform-origin:center; vertical-align:-2px; }
    .t-check svg { display:block; overflow:visible; width:15px; height:15px; }
    .t-check svg path { stroke-dasharray:43; stroke-dashoffset:43; }
    .t-check[data-state="in"] { animation: nv-cf var(--check-dur) var(--check-ease-out) forwards, nv-cr var(--check-dur) var(--check-ease-out) forwards, nv-cb var(--check-dur) var(--check-ease-bob) forwards, nv-cbl var(--check-dur) var(--check-ease-out) forwards; }
    .t-check[data-state="in"] svg path { animation: nv-cd var(--check-dur) var(--check-ease-out) var(--check-path-delay) forwards; }
    @keyframes nv-cf { from { opacity:0; } to { opacity:1; } }
    @keyframes nv-cr { from { transform:rotate(var(--check-rotate-from)); } to { transform:rotate(0); } }
    @keyframes nv-cb { from { translate:0 var(--check-y-amount); } to { translate:0 0; } }
    @keyframes nv-cbl { from { filter:blur(var(--check-blur-from)); } to { filter:blur(0); } }
    @keyframes nv-cd { to { stroke-dashoffset:0; } }

    /* ---- transitions.dev "error shake": o tremor roda via WAAPI (el.animate) — o className
       é reconstruído a cada poll e uma classe truncaria a animação no meio ---- */

    @media (prefers-reduced-motion: reduce) {
      .toast, .toast.is-open, .panel, .panel.is-open, .fab, .toast .j-row, .toast .j-caret, .toast .j-bar i { transition: none !important; }
      .t-check, .t-check svg path, .j-shim::before, .j-dot, .j-live i, .j-dots i { animation: none !important; }
      .t-check { opacity: 1; } .t-check svg path { stroke-dashoffset: 0; }
      .j-live i, .j-dots i { opacity: 1; }
    }
    .toast .j-note.on { display:flex; align-items:center; }
    .fab:focus-visible, .panel button:focus-visible { outline: 2px solid #7fb0ff; outline-offset: 2px; }
  `;

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const state = {
    cfg: null,
    host: null,
    root: null,
    fab: null,
    panel: null,
    toastEl: null,
    toastT: 0,
    video: null,
    cardEl: null,               // card do YouTube ancorando o FAB em página de lista (sem <video> sob o mouse)
    hideT: 0,
    idleT: 0,
    panelOpen: false,
    lastMove: 0,
    thumb: "",
    sent: new Map(),            // url -> assinatura (miniatura? prioridade): reenvia quando algo MUDA
    jobs: [],                   // downloads ativos do navegador (vêm do /jobs do servidor)
    jobsOpen: false,            // pilula expandida mostrando a lista
    notice: null,               // aviso transitório exibido na pilula
    jobRows: new Map(),         // id do job -> linha da lista (atualização no lugar, sem reconstruir)
    trackedJobs: new Map(),     // jobs iniciados por esta aba: acompanha até o estado final
    pos: null,
    dragMoved: false,
    dragging: false,
    posLoaded: false,
    posReady: false,     // só grava a posição padrão depois de ler a salva (senão sobrescreveria)
    toastPos: null,      // posição arrastada da pilula (por site)
    toastPosLoaded: false,
    toastPosReady: false,
    toastMoved: false,   // acabou de arrastar: o clique do release não expande a lista
    toastMovedT: 0,      // timer que desarma o toastMoved (dedup: arrastos seguidos vale o último)
    toastDragging: false
  };

  const sigOf = (it) => (it.thumb ? 1 : 0) + "|" + (it.pri || 0) + (it.kind === "Pinterest" ? "|" + it.title : "");     // Pinterest: o nome chega depois (API do pin)
  const isYT = () => /(^|\.)youtube\.com$/.test(location.hostname);
  const isIG = () => /(^|\.)instagram\.com$/.test(location.hostname);
  const isFB = () => /(^|\.)facebook\.com$/.test(location.hostname);
  // CDNs do Instagram/Facebook entregam o vídeo em pedaços (video-only / audio-only): nunca servem como arquivo
  const FRAG_HOST_RE = /(^|\.)(cdninstagram\.com|fbcdn\.net|tiktokcdn(-us|-eu)?\.com|tiktokv\.com|tiktok\.com|byteoversea\.com|ibytedtos\.com|ttwstatic\.com|tiktokw\.us|ibyteimg\.com|twimg\.com|pinimg\.com)$/i;
  const isTT = () => /(^|\.)tiktok\.com$/.test(location.hostname);
  const isX = () => /(^|\.)(x|twitter)\.com$/.test(location.hostname);
  const fabOn = () => !state.cfg || state.cfg.fab_enabled !== false;

  /* -------------------------------------------------------------- mensagens */
  // A extensão foi atualizada/recarregada com esta aba aberta: o navegador deixa ESTA cópia antiga rodando, sem acesso à extensão
  // (e o painel/ícone continuam sendo os da versão velha). Avisa uma vez para atualizar a página.
  let staleShown = false;
  function staleNotice() {
    if (staleShown) return;
    staleShown = true;
    finishingJobs.clear();
    try { hideFab(); closePanel(); } catch (_) {}
    try { state.jobs = []; if (window === window.top) toast(t("staleTab"), "refresh", 15000); } catch (_) {}
  }

  function sendMsg(payload, timeout = 25000) {
    if (!chrome.runtime || !chrome.runtime.id) { staleNotice(); return Promise.resolve({ ok: false, stale: true }); }
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        resolve(v || { ok: false });
      };
      const t = setTimeout(() => finish({ ok: false, timeout: true }), timeout);
      try {
        chrome.runtime.sendMessage(payload, (r) => {
          void chrome.runtime.lastError;               // SW indisponível: lê o erro pra não sujar o console
          clearTimeout(t);
          finish(r);
        });
      } catch (_) {
        clearTimeout(t);
        if (!chrome.runtime || !chrome.runtime.id) { staleNotice(); finish({ ok: false, stale: true }); return; }
        finish({ ok: false });
      }
    });
  }

  async function loadCfg() {
    const r = await sendMsg({ type: "GET_CONFIG" });
    if (r && r.config) state.cfg = r.config;
    if (!fabOn()) hideFab();
    return state.cfg;
  }

  /* -------------------------------------------------- posição salva (por site) */
  function loadPos() {
    if (state.posLoaded) return;
    state.posLoaded = true;
    try {
      chrome.storage.local.get(["fabPos","fabCardPos"], (res) => {
        const map = (res && res.fabPos) || {};
        const p = map[location.hostname];
        if (Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1])) state.pos = p;
        const card = res?.fabCardPos?.[location.hostname];
        if (Array.isArray(card) && card.length === 2 && card.every(Number.isFinite)) state.cardPos = card;
        state.posReady = true;
        const a = state.pendingAnchor; state.pendingAnchor = null;
        if (a && a.isConnected && a === (state.cardEl || state.video) && !state.panelOpen) { try { place(a); } catch (_) {} }   // a 1ª aparição já sai no lugar certo — sem o pulo "aparece e se desloca"
      });
    } catch (_) { state.posReady = true; }
  }

  function savePos() {
    const anc = state.video || state.cardEl;
    if (!anc || !state.fab || videoGone(anc)) return;             // âncora morta → não gravar posição lixo
    const isCard = anc === state.cardEl;
    const vr = anc.getBoundingClientRect();
    const fr = state.fab.getBoundingClientRect();
    const availW = Math.max(1, vr.width - FAB_SIZE);
    const availH = Math.max(1, vr.height - FAB_SIZE);
    persistPos([
      Math.min(1, Math.max(0, (fr.left - vr.left) / availW)),
      Math.min(1, Math.max(0, (fr.top - vr.top) / availH))
    ], isCard);
  }

  function persistPos(pos, isCard) {
    const key = isCard ? "fabCardPos" : "fabPos";
    if (isCard) state.cardPos = pos; else state.pos = pos;
    try {
      chrome.storage.local.get(key, (res) => {
        const map = res?.[key] || {};
        map[location.hostname] = pos;
        chrome.storage.local.set({ [key]: map });
      });
    } catch (_) {}
  }

  /* ------------------------------------------------------- pilula arrastável */
  function loadToastPos() {
    if (state.toastPosLoaded) return;
    state.toastPosLoaded = true;
    try {
      chrome.storage.local.get("toastPos", (res) => {
        const p = ((res && res.toastPos) || {})[location.hostname];
        if (Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1])) state.toastPos = p;
        state.toastPosReady = true;
      });
    } catch (_) { state.toastPosReady = true; }
  }
  function saveToastPos() {
    const el = state.toastEl;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    state.toastPos = [
      Math.min(1, Math.max(0, r.left / Math.max(1, innerWidth - r.width))),
      Math.min(1, Math.max(0, r.top / Math.max(1, innerHeight - r.height)))
    ];
    try {
      chrome.storage.local.get("toastPos", (res) => {
        const map = (res && res.toastPos) || {};
        map[location.hostname] = state.toastPos;
        chrome.storage.local.set({ toastPos: map });
      });
    } catch (_) {}
  }
  function applyToastPos() {
    const el = state.toastEl;
    if (!el || !state.toastPos || state.toastDragging) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(8, state.toastPos[0] * Math.max(1, innerWidth - w)), Math.max(8, innerWidth - w - 8));
    const top = Math.min(Math.max(8, state.toastPos[1] * Math.max(1, innerHeight - h)), Math.max(8, innerHeight - h - 8));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.bottom = "auto";
    el.style.transform = "none";
  }
  window.addEventListener("resize", applyToastPos, { passive:true });
  function onToastDown(e) {
    if (e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest(".j-x,button,a,input")) return;   // botões continuam botões
    const el = state.toastEl;
    if (!el || !el.classList.contains("is-open")) return;   // pilula invisível não arrasta
    // .j-sum precisa do click pra expandir/recolher a lista — preventDefault no pointerdown matava ele (div, não button)
    if (!(e.target && e.target.closest && e.target.closest(".j-sum"))) e.preventDefault();   // no resto da pilula: não selecionar texto ao arrastar
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const r = el.getBoundingClientRect();
    const offX = startX - r.left, offY = startY - r.top;
    const w = r.width, h = r.height;
    state.toastDragging = true;
    let moved = false;
    const move = (ev) => {
      if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
      moved = true;
      state.toastMoved = true;
      el.style.transform = "none";
      el.style.bottom = "auto";
      el.style.left = `${Math.round(Math.min(Math.max(8, ev.clientX - offX), Math.max(8, innerWidth - w - 8)))}px`;
      el.style.top = `${Math.round(Math.min(Math.max(8, ev.clientY - offY), Math.max(8, innerHeight - h - 8)))}px`;
      el.style.cursor = "grabbing";
    };
    const up = () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      el.style.cursor = "";
      state.toastDragging = false;
      if (moved) saveToastPos();
      clearTimeout(state.toastMovedT);
      state.toastMovedT = setTimeout(() => { state.toastMoved = false; }, 60);   // o clique pós-arrasto não dispara o expandir (2 arrastos <60ms: vale o último)
    };
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }



  /* -------------------------------------------------------------- utilidades */
  const folderName = (p) => {
    if (!p) return t("folderLabel");
    const parts = String(p).split(/[\\/]+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : p;
  };

  function ytId() {
    if (!isYT()) return "";
    const p = new URLSearchParams(location.search).get("v");
    if (p && /^[\w-]{6,}$/.test(p)) return p;
    const m = location.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{6,})/);      // Shorts, lives e embeds
    return m ? m[1] : "";
  }

  /* Instagram: cada vídeo é baixado pela URL do POST (yt-dlp), não pelos pedaços de rede do CDN.
     Procura o link do post (/p/, /reel/, /tv/) subindo a partir do <video>; no feed, o mais próximo é o do próprio post. */
  const IG_POST_RE = /^\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]{5,})/;
  function igPostUrl(v) {
    const toUrl = (m) => `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/`;
    const BAD = new Set(["audio", "explore", "tagged", "saved", "liked_by"]);       // /reels/audio/123/ é a página do áudio, não o post
    const find = (root) => {
      // 1º o link da DATA do post (<time>), que é sempre o do próprio post; depois qualquer link de post válido
      const t = root.querySelector("time");
      const ta = t && t.closest("a");
      const cands = [ta, ...root.querySelectorAll('a[href*="/p/"],a[href*="/reel/"],a[href*="/reels/"],a[href*="/tv/"]')].filter(Boolean);
      for (const a of cands) {
        const m = new URL(a.getAttribute("href"), location.href).pathname.match(IG_POST_RE);
        if (m && !BAD.has(m[2])) return toUrl(m);
      }
      return "";
    };
    try {
      // o <video> fica dezenas de níveis dentro do <article> do post (ou do diálogo do post aberto): procura nele todo
      const box = v.closest && (v.closest("article") || v.closest('[role="dialog"]'));
      if (box) { const u = find(box); if (u) return u; }
      for (let el = v, d = 0; el && el !== document.body && d < 30; el = el.parentElement, d++) {
        const u = find(el);
        if (u) return u;
      }
      const m = location.pathname.match(IG_POST_RE);
      if (m) return toUrl(m);
      if (/^\/stories\//.test(location.pathname)) return location.origin + location.pathname;
    } catch (_) {}
    return "";
  }

  /* Facebook: o vídeo vem em pedaços de fbcdn.net (video e áudio separados). Baixa-se pelo link do VÍDEO/REEL do post
     (/pagina/videos/ID, /reel/ID, /watch/?v=ID, /share/v/CÓDIGO...), que o yt-dlp resolve com áudio e vídeo juntos. */
  function fbCandidate(href) {
    let u;
    try { u = new URL(href, location.href); } catch (_) { return null; }
    if (!/(^|\.)facebook\.com$/.test(u.hostname)) return null;
    const p = u.pathname;
    let m;
    if ((m = p.match(/^\/reel\/(\d+)/))) return { rank: 1, url: `https://www.facebook.com/reel/${m[1]}` };
    if ((m = p.match(/^\/(?:[^/]+\/)*videos\/(?:[^/]+\/)?(\d{8,})/))) return { rank: 1, url: `https://www.facebook.com${p.replace(/\/$/, "")}` };
    if (/^\/watch\/?$/.test(p) && u.searchParams.get("v")) return { rank: 1, url: `https://www.facebook.com/watch/?v=${u.searchParams.get("v")}` };
    if ((m = p.match(/^\/share\/[vr]\/([\w-]+)/))) return { rank: 1, url: `https://www.facebook.com${m[0]}/` };
    if (/^\/video\.php$/.test(p) && u.searchParams.get("v")) return { rank: 1, url: `https://www.facebook.com/watch/?v=${u.searchParams.get("v")}` };
    if (/^\/[^/]+\/posts\/[\w-]{6,}/.test(p)) return { rank: 2, url: `https://www.facebook.com${p.replace(/\/$/, "")}` };
    if (/^\/permalink\.php$/.test(p) && u.searchParams.get("story_fbid")) return { rank: 2, url: `https://www.facebook.com/permalink.php?story_fbid=${u.searchParams.get("story_fbid")}&id=${u.searchParams.get("id") || ""}` };
    return null;
  }

  function fbVideoUrl(v) {
    const best = (root) => {
      let b = null;
      root.querySelectorAll("a[href]").forEach((a) => {
        const c = fbCandidate(a.getAttribute("href"));
        if (c && (!b || c.rank < b.rank)) b = c;
      });
      return b ? b.url : "";
    };
    try {
      const box = v.closest && (v.closest('[role="article"]') || v.closest('[role="dialog"]'));
      if (box) { const u = best(box); if (u) return u; }
      const here = fbCandidate(location.href);                        // página do próprio vídeo / reel / watch
      if (here) return here.url;
      for (let el = v, d = 0; el && el !== document.body && d < 30; el = el.parentElement, d++) {
        const u = best(el);
        if (u) return u;
      }
    } catch (_) {}
    return "";
  }

  function fbTitle(v) {
    try {
      const box = v.closest('[role="article"]');
      const h = box && box.querySelector("h2, h3, h4");
      const t = h ? h.innerText.replace(/\s+/g, " ").trim().slice(0, 80) : "";
      if (t) return t + " - Facebook";
    } catch (_) {}
    return document.title;
  }

  /* X/Twitter: o vídeo vem em pedaços de video.twimg.com (um pedaço de 1 KB não toca). Baixa-se pelo link do TWEET
     (/usuario/status/ID): o yt-dlp resolve, junta vídeo e áudio e pega todos os vídeos do tweet. */
  const X_STATUS_RE = /^\/(\w{1,30})\/status\/(\d{5,})/;
  function xTweetUrl(v) {
    const toUrl = (m) => `https://x.com/${m[1]}/status/${m[2]}`;
    try {
      const art = v.closest && v.closest("article");
      if (art) {
        // o link da DATA do tweet é sempre o do próprio tweet (os outros links do cartão levam a /analytics, /photo/1...)
        const t = art.querySelector("time");
        const ta = t && t.closest("a");
        const cands = [ta, ...art.querySelectorAll('a[href*="/status/"]')].filter(Boolean);
        for (const a of cands) {
          const m = new URL(a.getAttribute("href"), location.href).pathname.match(X_STATUS_RE);
          if (m) return toUrl(m);
        }
      }
      const m = location.pathname.match(X_STATUS_RE);          // página do próprio tweet
      if (m) return toUrl(m);
    } catch (_) {}
    return "";
  }

  function xTitle(v) {
    try {
      const art = v.closest("article");
      const nm = art && art.querySelector('[data-testid="User-Name"]');
      const tx = art && art.querySelector('[data-testid="tweetText"]');
      const user = nm ? nm.innerText.split("\n")[0].trim() : "";
      const text = tx ? tx.innerText.replace(/\s+/g, " ").trim().slice(0, 70) : "";
      if (user || text) return ((user ? user + " - " : "") + (text || "X")).slice(0, 110);
    } catch (_) {}
    return document.title;
  }

  /* Pinterest: o vídeo do pin chega por blob:/HLS e a página carrega dezenas de vídeos de pins RELACIONADOS (antes todos viravam
     itens iguais, "Pin em ...", sem miniatura). Agora cada pin é UM item, com o link do PIN (/pin/ID/): o servidor resolve todos os
     vídeos dele (carrossel com vários vídeos incluso). Nome e miniatura vêm da API do próprio Pinterest (mesma origem). */
  const isPin = () => /(^|\.)pinterest\.[a-z.]+$/.test(location.hostname);
  const PIN_PATH_RE = /^\/pin\/(\d{6,})/;
  const PIN_LINK_RE = /^\/pin\/(\d{6,})\/?$/;
  const pinCache = new Map();          // id -> null (buscando) | {n, title, thumb} | "-" (sem vídeo / falhou)
  function pinInfo(id) {
    if (pinCache.has(id)) return pinCache.get(id);
    pinCache.set(id, null);
    const q = encodeURIComponent(JSON.stringify({ options: { id, field_set_key: "unauth_react_main_pin" } }));
    fetch("/resource/PinResource/get/?data=" + q, {
      credentials: "include",
      headers: { Accept: "application/json", "X-Pinterest-PWS-Handler": "www/[username]/[slug].js", "X-Requested-With": "XMLHttpRequest" },
    })
      .then((r) => r.json())
      .then((j) => {
        const d = (j && j.resource_response && j.resource_response.data) || {};
        const lists = [];
        const add = (vid, img) => { const vl = vid && vid.video_list; if (vl && Object.keys(vl).length) lists.push({ vl, img }); };
        add(d.videos, d.images);
        ((d.carousel_data && d.carousel_data.carousel_slots) || []).forEach((s) => add(s.videos, s.images));
        ((d.story_pin_data && d.story_pin_data.pages) || []).forEach((p) => (p.blocks || []).forEach((b) => add(b.video, null)));
        const pick = (o) => { const k = o && (o["736x"] || o["474x"] || o["564x"] || o.orig); return k && /^https?:/i.test(k.url || "") ? k.url : ""; };
        let thumb = "";
        if (lists.length) {
          const first = lists[0];
          for (const k of Object.keys(first.vl)) { const th = first.vl[k] && first.vl[k].thumbnail; if (/^https?:/i.test(th || "")) { thumb = th; break; } }
          thumb = thumb || pick(first.img) || pick(d.images);
        }
        const title = String(d.seo_title || d.title || d.grid_title || "").split(" | ")[0].replace(/\s+/g, " ").trim().slice(0, 80);
        pinCache.set(id, lists.length ? { n: lists.length, title, thumb } : "-");
        publish(true);
      })
      .catch(() => { pinCache.set(id, "-"); publish(true); });
    return null;
  }

  // link do PIN de um <video>: o do próprio cartão (feed) ou o da página (pin aberto). Nunca procura fora do cartão: o pin aberto
  // também tem links /pin/ID/... que não são deste vídeo.
  // O vídeo do PIN ABERTO. No Pinterest logado ele nem sempre está dentro de CloseupMainPin (às vezes o bloco de "relacionados" envolve a
  // página toda, e o pôster não tem o código do vídeo): vale também o vídeo grande, que é o maior da página.
  function pinIsMain(v) {
    if (!PIN_PATH_RE.test(location.pathname)) return false;
    if (v.closest('[data-test-id="CloseupMainPin"], [data-test-id="story-pin-closeup"], [data-test-id="closeup-body-landscape"]')) return true;
    const r = v.getBoundingClientRect();
    if (r.width < 380) return false;
    const area = r.width * r.height;
    return [...document.querySelectorAll("video")].every((o) => { if (o === v) return true; const q = o.getBoundingClientRect(); return q.width * q.height <= area; });
  }

  function pinCardUrl(v) {
    try {
      if (pinIsMain(v)) {
        const m = location.pathname.match(PIN_PATH_RE);
        return m ? `https://www.pinterest.com/pin/${m[1]}/` : "";
      }
      const card = v.closest('[role="listitem"], [data-grid-item], [data-test-id="pin"], [data-test-id="pinWrapper"]');
      if (card) {
        for (const a of card.querySelectorAll('a[href*="/pin/"]')) {
          const m = new URL(a.getAttribute("href"), location.href).pathname.match(PIN_LINK_RE);
          if (m) return `https://www.pinterest.com/pin/${m[1]}/`;
        }
      }
      // layout sem cartão conhecido: sobe a partir do vídeo e pega o 1º link /pin/ID/ que apareça, parando quando o bloco
      // já tem mais de um vídeo (aí o link seria de outro cartão)
      for (let el = v.parentElement, d = 0; el && el !== document.body && d < 16; el = el.parentElement, d++) {
        if (el.querySelectorAll("video").length > 1) break;
        for (const a of el.querySelectorAll('a[href*="/pin/"]')) {
          const m = new URL(a.getAttribute("href"), location.href).pathname.match(PIN_LINK_RE);
          if (m) return `https://www.pinterest.com/pin/${m[1]}/`;
        }
      }
      const here = location.pathname.match(PIN_PATH_RE);
      if (here && !v.closest('[data-test-id="relatedPins"]') && !card) return `https://www.pinterest.com/pin/${here[1]}/`;
    } catch (_) {}
    return "";
  }

  // Cartão do feed SEM link de pin (o Pinterest não põe link quando você não está logado): o vídeo se reconhece pelo "hash" do
  // pôster, e o endereço do stream (o que o player pediu) o fundo da extensão guarda por esse mesmo hash.
  const pinHashCache = new Map();      // hash -> { url, at }
  function pinFeedUrl(v) {
    const u = pinCardUrl(v);
    if (u) return u;
    const m = String(v.poster || "").match(/([0-9a-f]{32})\.\d+\.jpe?g/i);
    if (!m) return "";
    const h = m[1].toLowerCase();
    const c = pinHashCache.get(h);
    if (c && c.url) return c.url;
    if (c && Date.now() - c.at < 2500) return "";
    pinHashCache.set(h, { url: "", at: Date.now() });
    sendMsg({ type: "PIN_STREAM", hash: h }, 4000).then((r) => {
      if (r && r.ok && r.url) { pinHashCache.set(h, { url: r.url, at: Date.now() }); publish(true); }
    });
    return "";
  }

  function pinTitle(url, fallback) {
    const m = String(url).match(/\/pin\/(\d+)/);
    const i = m && pinCache.get(m[1]);
    return (i && i !== "-" && i.title) || fallback;
  }

  /* TikTok: idem, o vídeo é baixado pela URL da página do vídeo (/@usuario/video/ID). */
  const TT_RE = /^\/(@[\w.]+)\/video\/(\d+)/;
  // LinkedIn: o feed não é um vídeo. Resolva somente o card do player apontado.
  function liCanonical(raw) {
    try {
      const u = new URL(raw, location.href);
      if (!/(^|\.)linkedin\.com$/i.test(u.hostname)) return "";
      const p = decodeURIComponent(u.pathname);
      const m = p.match(/^\/feed\/update\/(urn:li:activity:\d+)\/?$/);
      if (m) return "https://www.linkedin.com/feed/update/" + m[1] + "/";
      if (/^\/posts\/[^/]+-\d+-[\w-]{4}\/?$/.test(p)) return "https://www.linkedin.com" + p;
    } catch (_) {}
    return "";
  }
  const liSources = new WeakMap();
  document.addEventListener('noevfx-linkedin-source', e => {
    if (!isLI() || !e.target || e.target.tagName !== 'VIDEO' || typeof e.detail !== 'string' || e.detail.length > 1200000) return;
    try {
      const data = JSON.parse(e.detail);
      if ((Array.isArray(data.playlists) && data.playlists.length) || /^https:\/\/dms\.licdn\.com\/playlist\/vid\//i.test(data.sourceUrl || '')) liSources.set(e.target,data);
      else liSources.delete(e.target);
    } catch (_) {}
  });
  function liSource(v) {
    const data = v && liSources.get(v);
    return data && data.videoSrc === v.currentSrc ? data : undefined;
  }
  function liManifest(v) {
    const data = liSource(v);
    return data && Array.isArray(data.playlists) && data.playlists.length ? data : undefined;
  }
  function liMedia(v) {
    if (!v) return "";
    const candidates = [];
    try {
      const sources = JSON.parse(v.getAttribute("data-sources") || "[]");
      if (Array.isArray(sources)) sources.slice().sort((a,b) => (+b["data-bitrate"] || 0) - (+a["data-bitrate"] || 0)).forEach(s => candidates.push(s.src));
    } catch (_) {}
    candidates.push(v.currentSrc, v.src);
    const captured = liSource(v);
    if (captured) {
      if (/^https:\/\/dms\.licdn\.com\/playlist\/vid\//i.test(captured.sourceUrl || '')) candidates.push(captured.sourceUrl);
      const first = captured.playlists?.[0]?.segments?.[0]?.uri;
      if (/^https:\/\/dms\.licdn\.com\/playlist\/vid\/v2\//i.test(first || '')) candidates.push(first);
    }
    try { v.querySelectorAll("source[src]").forEach(s => candidates.push(s.src)); } catch (_) {}
    // MSE usa blob:, mas o poster/URN identifica o MESMO asset nas requisições.
    // Nunca recorrer ao primeiro stream da aba (pode ser de outro post).
    const urn = v.getAttribute("data-digitalmedia-asset-urn") || "";
    let poster = v.poster || v.getAttribute("data-poster-url") || "";
    // Feed SDUI: o poster é um <img> dentro do Video.js, não um atributo do video.
    if (!poster) {
      const player = v.closest('[data-vjs-player], [aria-label="Video Player"]');
      if (player && player.querySelectorAll("video").length === 1) {
        const img = [...player.querySelectorAll("img[src]")].find(i => /licdn\.com\/(?:dms\/image\/|playlist\/vid\/)/i.test(i.src));
        if (img) poster = img.src;
      }
    }
    const asset = (urn.match(/urn:li:digitalmediaAsset:([\w-]+)/) || poster.match(/\/(?:dms\/image|playlist\/vid)\/(?:v2\/)?([\w-]+)\/(?:videocover|thumbnail)/) || [])[1];
    if (asset) {
      try {
        performance.getEntriesByType("resource").slice(-300).forEach(e => {
          const u = new URL(e.name);
          if (/(^|\.)licdn\.com$/i.test(u.hostname) && u.pathname.includes("/" + asset + "/") && /(?:\.m3u8$|\.mpd$|\/mp4-[^/]+\/)/i.test(u.pathname)) candidates.push(u.href);
        });
      } catch (_) {}
    }
    return candidates.find(s => typeof s === "string" && /^https?:\/\//i.test(s) && !/(?:\.(?:m4s|ts|m4a)(?:[?#]|$)|[?&](?:bytestart|byteend)=|\/(?:drm|segment|chunk|fragment)\/)/i.test(s)) || "";
  }
  function liPostUrl(v) {
    let el = v && v.parentElement;
    for (let n = 0; el && el !== document.body && n < 14; n++, el = el.parentElement) {
      // Não subir até o contêiner do feed e pegar o post vizinho.
      if (el.querySelectorAll("video").length > 1) break;
      for (const attr of ["data-urn", "data-id", "data-activity-urn"]) {
        const m = (el.getAttribute(attr) || "").match(/urn:li:activity:\d+/);
        if (m) return "https://www.linkedin.com/feed/update/" + m[0] + "/";
      }
      const links = new Set();
      el.querySelectorAll("a[href]").forEach(a => { const u = liCanonical(a.href); if (u) links.add(u); });
      if (links.size === 1) return [...links][0];
      if (links.size > 1) break;
    }
    return document.querySelectorAll("video").length === 1 ? liCanonical(location.href) : "";
  }
  const isLI = () => /(^|\.)linkedin\.com$/.test(location.hostname);

  function ttPostUrl(v) {
    const toUrl = (m) => `https://www.tiktok.com/${m[1]}/video/${m[2]}`;
    try {
      // O feed/Explorar mantém a URL genérica e usa blob:. O ID fica no
      // próprio player; nunca pegar o primeiro link de outro cartão do feed.
      let card = null;
      for (let el = v, d = 0; el && el !== document.body && d < 12; el = el.parentElement, d++) {
        const id = (el.id || "").match(/^xgwrapper-\d+-(\d{10,})$/);
        const dataId = el.getAttribute("data-video-id") || el.getAttribute("data-item-id") || "";
        if (id || /^\d{10,}$/.test(dataId)) return `https://www.tiktok.com/embed/${id ? id[1] : dataId}`;
        if (el.matches('article,[data-e2e="recommend-list-item-container"],[data-e2e="explore-hero-preview"],[data-hero-slot]')) { card = el; break; }
      }
      for (let el = v, d = 0; el && el !== document.body && d < 12; el = el.parentElement, d++) {
        if (el.querySelectorAll("video").length > 1) break;
        const urls = new Set();
        for (const a of el.querySelectorAll('a[href*="/video/"]')) {
          const u = new URL(a.getAttribute("href"), location.href);
          const m = /(^|\.)tiktok\.com$/.test(u.hostname) && u.pathname.match(TT_RE);
          if (m) urls.add(toUrl(m));
        }
        if (urls.size === 1) return [...urls][0];
        if (urls.size > 1 || el === card) break;
      }
      const m = location.pathname.match(TT_RE);
      if (m) return toUrl(m);
    } catch (_) {}
    return "";
  }

  // miniatura do TikTok pelo oEmbed do próprio site (mesma origem): vem certa para CADA vídeo
  const ttCache = new Map();           // url -> link da miniatura | "-" (falhou) | "" (buscando)
  function ttThumb(url) {
    if (ttCache.has(url)) return ttCache.get(url);
    ttCache.set(url, "");
    fetch("/oembed?url=" + encodeURIComponent(url), { credentials: "omit" })
      .then((r) => r.json())
      .then((j) => {
        const u = j && /^https?:/i.test(j.thumbnail_url || "") ? j.thumbnail_url : "-";
        ttCache.set(url, u);
        if (location.href) publish(true);
      })
      .catch(() => { ttCache.set(url, "-"); publish(true); });
    return "";
  }

  function igTitle(v) {
    try {
      const box = (v.closest && (v.closest("article") || v.closest('[role="dialog"]'))) || document;
      for (const a of box.querySelectorAll('a[href^="/"]')) {
        if (/^\/[\w.]+\/$/.test(a.getAttribute("href")) && a.textContent.trim()) return a.textContent.trim().slice(0, 60) + " - Instagram";
      }
    } catch (_) {}
    return document.title;
  }

  function resolveBestPageOrVideoUrl(videoEl) {
    if (isYT()) {
      const v = ytId();
      return v ? `https://www.youtube.com/watch?v=${v}` : location.href;
    }
    if (videoEl) {
      const holder = videoEl.closest && videoEl.closest("[data-video-id]");
      if (holder) {
        const vid = holder.getAttribute("data-video-id");
        if (vid && /^\d+$/.test(vid)) return `https://globoplay.globo.com/v/${vid}/`;
      }
      const src = videoEl.currentSrc || videoEl.src ||
        (videoEl.querySelector && videoEl.querySelector("source") && videoEl.querySelector("source").src) || "";
      if (src && src.startsWith("http")) return src;
    }
    return location.href;
  }

  /* YouTube fora do /watch (home, busca, canal, sidebar): a página é genérica — o vídeo certo é o
     link do CARD que contém o player apontado (a prévia ao passar o mouse). Ambíguo → não inventa. */
  function ytCardInfo(v) {
    const idsIn = (node) => {                        // ids de vídeo distintos linkados dentro de um elemento
      const ids = new Set();
      node.querySelectorAll("a[href]").forEach((a) => {
        let u;
        try { u = new URL(a.getAttribute("href"), location.href); } catch (_) { return; }
        let id = "";
        if (/(^|\.)youtu\.be$/.test(u.hostname)) { const m = u.pathname.match(/^\/([\w-]{6,})/); id = m ? m[1] : ""; }
        else if (/(^|\.)youtube\.com$/.test(u.hostname)) {
          if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
          else { const m = u.pathname.match(/^\/(?:shorts|live|embed|clip)\/([\w-]{6,})/); id = m ? m[1] : ""; }
        }
        if (/^[\w-]{6,}$/.test(id)) ids.add(id);
      });
      return ids;
    };
    try {
      for (let el = v, d = 0; el && el !== document.body && d < 16; el = el.parentElement, d++) {
        if (el.querySelectorAll && el.querySelectorAll("video").length > 1) break;   // contêiner misturando cards
        const ids = idsIn(el);
        if (ids.size > 1) break;                                   // nunca adivinhar entre cards vizinhos
        if (ids.size === 1) {
          const id = [...ids][0];
          // o primeiro ancestral com 1 link pode ser só o thumbnail: título/selo vivem no card-raiz (metadados)
          let root = (v.closest && v.closest("ytd-rich-item-renderer, yt-lockup-view-model, ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer, ytm-shorts-lockup-view-model, ytd-grid-video-renderer, ytd-reel-item-renderer")) || el;
          if (root !== el && idsIn(root).size > 1) root = el;    // raiz com vídeos mistos: metadados ficam no el
          const ttl = root.querySelector("#video-title, #video-title-link, h3 a, .yt-lockup-metadata-view-model-wiz__title, a.shortsLockupViewModelHostEndpoint");
          const name = (ttl && ttl.textContent.trim().slice(0, 140)) || "";
          // selo AO VIVO do card: classe de live, overlay-time-status=LIVE (estrutural) ou um selo
          // cujo texto seja exatamente "AO VIVO"/"LIVE" — título com "live" no meio NÃO conta (replay de live encerrada é VOD)
          const live = !!(root.querySelector('[class*="badge-style-type-live"], badge-shape[class*="live"], [class*="thumbnail-badge"][class*="live"], [class*="live-now"], [overlay-style="LIVE" i]')
            || [...root.querySelectorAll("badge-shape, yt-thumbnail-badge-view-model, yt-badge-shape, [class*='badge'], [class*='overlay']")]
                 .some((s) => { const tx = (s.textContent || "").trim(); return tx.length < 60 && /^(ao[- ]?vivo|aovivo|live)\b/i.test(tx); })
            || (ttl && /\bao[- ]?vivo\b|\baovivo\b/i.test(ttl.textContent)));
          return { url: `https://www.youtube.com/watch?v=${id}`, title: name, live };
        }
      }
    } catch (_) {}
    return null;
  }

  /* Feeds de outros sites (Vimeo, Dailymotion, Twitch, blogs...): o link de mídia do próprio card
     vence o endereço genérico da página. Mesma regra de ambiguidade: 1 link de mídia ou nada. */
  const CARD_MEDIA_RE = /^\/(?:watch|video|videos|clip|clips|pin|reel|reels|tv|shorts|live|embed|media|post|posts|e|v)\/|^\/\d{5,}\/?$|^\/[\w.-]+\/(?:videos?|clip|status)\/|\.ghtml?$/i;   // .ghtml = matéria da Globo
  function genericCardUrl(v) {
    try {
      for (let el = v, d = 0; el && el !== document.body && d < 14; el = el.parentElement, d++) {
        if (el.querySelectorAll && el.querySelectorAll("video").length > 1) break;
        const links = new Set();
        el.querySelectorAll("a[href]").forEach((a) => {
          try {
            const u = new URL(a.getAttribute("href"), location.href);
            if (u.hostname === location.hostname && CARD_MEDIA_RE.test(u.pathname)) links.add(u.origin + u.pathname);
          } catch (_) {}
        });
        if (links.size === 1) return [...links][0];
        if (links.size > 1) break;
      }
    } catch (_) {}
    return "";
  }

  /* YouTube /watch de uma live: selo AO VIVO nos controles do player ou badge nos metadados
     (a classe exata varia entre layouts — checa classe e o próprio texto do selo). */
  function ytWatchLive() {
    try {
      if (document.querySelector(".ytp-live")) return true;
      for (const b of document.querySelectorAll('ytd-watch-metadata [class*="badge"], ytd-watch-flexy [class*="badge"], #info ytd-badge-supported-renderer, ytd-badge-supported-renderer[class*="live"], badge-shape[class*="live"]')) {
        const c = String(b.getAttribute && b.getAttribute("class") || "");
        if (/live/i.test(c)) return true;
        if (/^\s*(ao vivo|live|ao[- ]?vivo)\s*$/i.test(b.textContent || "")) return true;
      }
    } catch (_) {}
    return false;
  }

  /* "Esta página é uma transmissão ao vivo?" — usado pelo popup, que não enxerga o DOM.
     Sinal universal: live não tem duração finita — o <video> reporta duration === Infinity
     (YouTube, Twitch, Facebook, Vimeo, Globo, qualquer player MSE/HLS). */
  function pageIsLive() {
    try {
      const v = (state.video && state.video.isConnected) ? state.video : document.querySelector("video");
      if (v && v.isConnected && v.duration === Infinity) return true;
      if (isYT() && ytWatchLive()) return true;
      if (/(^|\.)globo\.com$/.test(location.hostname) && state.video && cardIsLive(state.video)) return true;
    } catch (_) {}
    return false;
  }

  /* O card tem selo "AO VIVO"? (Globo: o player da home já está transmitindo — o vídeo certo é o
     stream HLS mestre, não a página da matéria, que só traz os clipes sob demanda.) */
  function cardIsLive(v) {
    try {
      for (let el = v, d = 0; el && el !== document.body && d < 10; el = el.parentElement, d++) {
        if (el.querySelectorAll && el.querySelectorAll("video").length > 1) break;   // contêiner de vários cards: pare
        if (/\bao[- ]?vivo\b|\baovivo\b/i.test((el.textContent || "").slice(0, 4000))) return true;
      }
    } catch (_) {}
    return false;
  }

  /* Endereços de feed/listagem de sites conhecidos NÃO identificam um vídeo — enviar isso ao motor
     baixaria um vídeo qualquer (foi o bug do youtube.com/ no feed). O servidor recusa também. */
  function isGenericFeedUrl(raw) {
    try {
      const u = new URL(raw, location.href);
      const h = u.hostname.toLowerCase();
      const p = u.pathname, seg = p.split("/")[1] || "", root = p === "/" || p === "";
      if (/(^|\.)youtu\.be$/.test(h)) return root;
      if (/(^|\.)youtube\.com$/.test(h)) return root || /^(feed|results|gaming|music|premium|kids|playlist|playlists|hashtag|channel|user|show|live|podcasts)/i.test(seg) || seg.startsWith("@");
      if (/(^|\.)linkedin\.com$/.test(h)) return root || /^\/feed\/?$/i.test(p);     // /feed/update/urn:li:... já É um post
      if (/(^|\.)tiktok\.com$/.test(h)) return root || /^(foryou|following|discover|explore|search)$/i.test(seg);
      if (/(^|\.)instagram\.com$/.test(h)) return root || /^\/(explore|reels)\/?$/i.test(p);
      if (/(^|\.)(x|twitter)\.com$/.test(h)) return root || /^(home|explore|i)$/i.test(seg);
      if (/(^|\.)facebook\.com$/.test(h)) return root || /^\/(watch|reel|video|stories|marketplace|groups)\/?$/i.test(p);
      if (/(^|\.)pinterest\.[a-z.]+$/.test(h)) return root || /^(ideas|today|search)/i.test(seg);
      if (/(^|\.)vimeo\.com$/.test(h)) return root || /^(categories|channels|groups|feed|watch|upgrade|features|blog|ondemand)/i.test(seg);
      if (/(^|\.)dailymotion\.com$/.test(h)) return root || !/^\/video\//i.test(p);
      if (/(^|\.)dai\.ly$/.test(h)) return root;
      if (/(^|\.)twitch\.tv$/.test(h)) return root || /^(directory|p|downloads|jobs|turbo|prime)/i.test(seg) || /\/videos\/?$/i.test(p);
      if (/(^|\.)globo\.com$/.test(h)) {        // g1, ge, gshow...: matéria é .ghtml; home e seções (terminam em /) são listagem
        if (/(^|\.)globoplay\./.test(h)) return root || !/^\/v\/\d+/i.test(p);
        return root || (/\/$/.test(p) && !/\.ghtml?$/i.test(p));
      }
      return false;
    } catch (_) { return false; }
  }

  /* ------------------------------------------------------------------- thumb */
  function pageThumb() {
    const yt = ytId();
    if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    const meta = document.querySelector(
      'meta[property="og:image"], meta[name="og:image"], meta[name="twitter:image"], link[rel="image_src"]'
    );
    if (meta) {
      const c = meta.content || meta.href;
      if (c && /^https?:/i.test(c)) return c;
    }
    const v = document.querySelector("video");
    if (v && v.poster && /^https?:/i.test(v.poster)) return v.poster;
    return "";
  }

  function frameOf(videoEl) {
    try {
      if (!videoEl.videoWidth || !videoEl.videoHeight) return "";
      if (videoEl.readyState < 2) return "";
      const w = 200;
      const h = Math.round((w * videoEl.videoHeight) / videoEl.videoWidth) || 112;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(videoEl, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.62);
    } catch (_) {
      return "";
    }
  }

  /* ------------------------------------------------------------------- scan - */
  const MEDIA_RE = /\.(m3u8|mpd|mp4|webm|m4v|mov|flv|mkv)(\?|#|$)/i;

  // Lista de mídia vista na rede, mantida por um PerformanceObserver: o buffer
  // padrão do navegador guarda só 250 recursos e depois deixa de registrar.
  const netList = [];
  const netSet = new Set();
  function noteNet(name) {
    if (!name || netSet.has(name) || !MEDIA_RE.test(name)) return;
    if (/\/range\/prot\/|[?&](bytestart|byteend)=/i.test(name)) return;                      // pedido por faixa de bytes: um pedaço, não o vídeo
    if (/\/drm\/(cenc|widevine|playready|fairplay)/i.test(name)) return;                      // manifesto com DRM: ninguém baixa
    if (/(\/|[-_.])(segment|seg|frag|fragment|chunk|init)[-_\d]*\.(mp4|m4v|m4a|webm)(\?|#|$)/i.test(name)) return;   // pedaço de DASH/HLS: não toca sozinho
    netSet.add(name);
    netList.push(name);
    if (netList.length > 300) netSet.delete(netList.shift());
  }
  try {
    performance.getEntriesByType("resource").forEach((e) => noteNet(e.name));
    new PerformanceObserver((l) => l.getEntries().forEach((e) => noteNet(e.name)))
      .observe({ type: "resource", buffered: true });
  } catch (_) {}

  function scan() {
    let thumb = state.thumb;
    if (!thumb && !isIG() && !isTT()) {      // no Instagram cada vídeo tem a própria miniatura (a do og:image é a mesma para todos)
      thumb = pageThumb();
      if (!thumb) {
        try {
          const v = document.querySelector("video");
          if (v) thumb = frameOf(v);
        } catch (_) {}
      }
      if (thumb) state.thumb = thumb;
    }
    const items = [];
    const seen = new Set();
    const push = (url, kind, own, title, pri) => {
      if (!url || !/^https?:/i.test(url)) return;
      if (seen.has(url)) return;
      const pg = kind === "LinkedIn" || kind === "TikTok" || kind === "Instagram" || kind === "Facebook" || kind === "Vimeo" || kind === "Página" || kind === "X" || kind === "Pinterest";      // URL da PÁGINA do vídeo (yt-dlp)
      if (!pg) { try { if (FRAG_HOST_RE.test(new URL(url).hostname)) return; } catch (_) { return; } }
      seen.add(url);
      const it = { url, kind: kind || "Player", title: title || document.title };
      if (pg) it.pg = 1;
      if (pri) it.pri = pri;
      if (own) it.thumb = own;       // miniatura PRÓPRIA do vídeo (a da página vai uma vez só, no nível da mensagem)
      items.push(it);
    };

    for (let i = netList.length - 1; i >= 0 && i > netList.length - 240; i--) push(netList[i], "Rede");

    let vids = [];
    try { vidCacheAt = 0; vids = allVideos(); } catch (_) {}

    vids.forEach((v) => {
      const src = v.currentSrc || v.src ||
        (v.querySelector("source") && v.querySelector("source").src) || "";
      if (src && /^https?:/i.test(src)) {
        const own = frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : "");
        push(src, "HTML5", own);
      }
    });

    if (isIG()) {
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) return;
        const u = igPostUrl(v);
        const own = frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : "");
        if (u) push(u, "Instagram", own, igTitle(v), v.paused ? 1 : 2);        // sem miniatura ainda: entra assim e ganha a imagem depois
      });
    }
    if (/(^|\.)player\.vimeo\.com$/.test(location.hostname) && /^\/video\/\d+/.test(location.pathname)) {
      const v = vids.find((x) => x.getBoundingClientRect().width >= 150);
      if (v) push(location.href, "Vimeo", frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : ""), document.title, v.paused ? 1 : 2);
    }
    // Player com blob:/MSE (Vimeo e muitos outros) em site SEM tratamento próprio: não existe URL de arquivo para listar,
    // então o item é o endereço da PÁGINA (o yt-dlp resolve), com o quadro do próprio vídeo de miniatura.
    if (!isLI() && !isIG() && !isTT() && !isX() && !isYT() && !isFB() && !isPin() && !items.some((i) => i.kind === "Rede" || i.kind === "HTML5" || i.kind === "Globo/G1" || i.kind === "Embed")) {
      const bv = vids.find((v) => {
        const r = v.getBoundingClientRect();
        const src = v.currentSrc || v.src || "";
        return r.width >= 150 && r.height >= 90 && v.readyState >= 1 && (src === "" || /^blob:/i.test(src));
      });
      if (bv) push(location.href, "Página", frameOf(bv) || (/^https?:/i.test(bv.poster || "") ? bv.poster : ""), document.title, bv.paused ? 1 : 2);
    }
    if (isX()) {
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) return;
        const u = xTweetUrl(v);
        if (u) push(u, "X", frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : ""), xTitle(v), v.paused ? 1 : 2);
      });
    }
    if (isTT()) {
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) return;
        const u = ttPostUrl(v);
        if (!u) return;
        let own = frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : "");
        if (!own) {
          const c = ttThumb(u);
          if (c === "") return;                  // buscando a miniatura: entra quando chegar
          own = c === "-" ? "" : c;
        }
        push(u, "TikTok", own, document.title, v.paused ? 1 : 2);
      });
    }
    if (isLI()) {
      vids.forEach(v => {
        const u = liPostUrl(v), media = liMedia(v);
        if (!u && !media) return;
        push(u || media, "LinkedIn", frameOf(v) || v.poster || "", document.title, v.paused ? 1 : 2);
        const item = items.find(i => i.url === (u || media));
        if (item && u && media) item.fallbackStream = media;
        if (item && liManifest(v)) item.linkedinManifest = liManifest(v);
      });
    }
    if (isFB()) {
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) return;
        const u = fbVideoUrl(v);
        if (u) push(u, "Facebook", frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : ""), fbTitle(v), v.paused ? 1 : 2);
      });
    }
    if (isPin()) {
      const pm = location.pathname.match(PIN_PATH_RE);
      const mainUrl = pm ? `https://www.pinterest.com/pin/${pm[1]}/` : "";
      if (mainUrl) {
        const info = pinInfo(pm[1]);
        const mv = vids.find((v) => pinIsMain(v));
        if (info && info !== "-") push(mainUrl, "Pinterest", info.thumb, (info.title || "Pinterest") + (info.n > 1 ? ` (${info.n} vídeos)` : ""), 2);
        else if (info === "-" && mv) push(mainUrl, "Pinterest", frameOf(mv) || (/^https?:/i.test(mv.poster || "") ? mv.poster : ""), document.title, 2);
      }
      vids.forEach((v) => {
        const r = v.getBoundingClientRect();
        if (r.width < 120 || r.height < 120) return;
        const u = pinFeedUrl(v);
        if (!u || u === mainUrl) return;
        const pid = u.match(/pinterest\.com\/pin\/(\d+)/);
        const info = pid ? pinInfo(pid[1]) : null;
        const own = frameOf(v) || (/^https?:/i.test(v.poster || "") ? v.poster : "") || (info && info !== "-" ? info.thumb : "");
        push(u, "Pinterest", own, pinTitle(u, pid ? "Pinterest" : t("pinVideo")), v.paused ? 1 : 2);
      });
    }

    try {
      document.querySelectorAll("[data-video-id]").forEach((el) => {
        const vid = el.getAttribute("data-video-id");
        if (!vid || !/^\d{7,}$/.test(vid)) return;       // 6 dígitos = transmissão ao vivo: baixa-se pelo HLS da rede
        // SÓ conta como vídeo DA PÁGINA o bloco que tem um <video> (player de verdade). Outros blocos com data-video-id
        // são cartões de "veja também" / outras matérias: listá-los fazia baixar um vídeo que não tem nada a ver.
        const pv = el.tagName === "VIDEO" ? el : el.querySelector("video");
        if (!pv) return;
        let own = frameOf(pv) || (/^https?:/i.test(pv.poster || "") ? pv.poster : "");
        const r = pv.getBoundingClientRect();
        const seen = r.width > 60 && r.height > 60 && r.bottom > 0 && r.top < innerHeight;
        const pri = !pv.paused && seen ? 2 : seen ? 1 : 0;
        if (!own) {                                        // vídeo ainda sem quadro: usa a imagem do próprio player
          const im = el.querySelector("img[src^='http']");
          if (im && im.naturalWidth > 100) own = im.src;
        }
        push(`https://globoplay.globo.com/v/${vid}/`, "Globo/G1", own, undefined, pri);
      });
    } catch (_) {}

    try {
      document.querySelectorAll("iframe[src]").forEach((f) => {
        const s = f.src || "";
        // players embutidos que o yt-dlp entende (o iframe é baixado com a página de fora como Referer)
        if (/youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com|dailymotion\.com\/embed|players?\.globo\.com|play\.hotmart\.com|hotmart\.com\/.*embed|fast\.wistia\.(net|com)|wistia\.(net|com)\/embed|players?\.vturb|pandavideo|jwplatform\.com|brightcove|kaltura|loom\.com\/embed|streamable\.com\/e\/|player\.twitch\.tv|vidyard|mediadelivery\.net\/embed|iframe\.mediadelivery/i.test(s)) {
          push(s, "Embed");
        }
      });
    } catch (_) {}

    // Página de vídeo do YouTube: o vídeo entra SEMPRE na lista (antes só entrava se a URL tivesse algo além de
    // "watch?v=...", e na URL limpa o popup ficava com "0 vídeos detectados" e sem miniatura).
    const yv = ytId();
    if (yv) push(`https://www.youtube.com/watch?v=${yv}`, "YouTube");

    return { items, thumb, count: items.length };
  }

  let sendT = 0;
  function publish(force) {
    if (!force && Date.now() - sendT < 1200) return;
    sendT = Date.now();
    const { items, thumb } = scan();
    const fresh = items.filter((it) => state.sent.get(it.url) !== sigOf(it));    // novo OU ganhou miniatura/prioridade
    if (thumb) state.thumb = thumb;
    if (!fresh.length && !thumb) return;
    fresh.forEach((it) => state.sent.set(it.url, sigOf(it)));
    sendMsg({ type: "DOM_MEDIA_FOUND", items: fresh, thumb, title: document.title });
  }

  /* ------------------------------------------------------------ shadow host */
  function ensureHost() {
    const parent = document.fullscreenElement || document.documentElement || document.body;
    if (!parent) return null;
    if (state.host && state.host.isConnected && state.host.parentNode === parent) return state.host;
    if (!state.host) {
      const host = document.createElement("div");
      host.id = "noevfx-hover-host";
      host.style.cssText = "all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;";
      // "closed": o JavaScript da página não enxerga nem mexe no painel, nos botões e nos avisos
      const root = host.attachShadow({ mode: "closed" });
      root.innerHTML = `<style>${STYLE}</style>
        <button class="fab" type="button" aria-haspopup="dialog" aria-controls="download-panel" aria-expanded="false" title="${esc(t("fabTitle"))}" aria-label="${esc(t("fabTitle"))}">${BRAND_SVG}</button>
        <div class="panel" id="download-panel" role="dialog" aria-label="Noe VFX Downloader"></div>
        <div class="toast" role="status" aria-live="polite"></div>`;
      state.host = host;
      state.root = root;
      state.fab = root.querySelector(".fab");
      state.panel = root.querySelector(".panel");
      state.toastEl = root.querySelector(".toast");
      state.toastEl.addEventListener("pointerdown", onToastDown, true);   // a pilula inteira é alça de arrasto

      state.fab.addEventListener("pointerdown", onFabDown, true);
      state.fab.addEventListener("click", onFabClick, true);
      state.fab.addEventListener("mouseenter", () => { clearTimeout(state.idleT); clearTimeout(state.hideT); });
      state.fab.addEventListener("mouseleave", () => { scheduleHide(); armIdle(); });
      state.panel.addEventListener("mouseenter", () => { clearTimeout(state.idleT); clearTimeout(state.hideT); });
      state.panel.addEventListener("mouseleave", () => { scheduleHide(); armIdle(); });
    }
    try { parent.appendChild(state.host); } catch (_) {}
    return state.host;
  }

  document.addEventListener("fullscreenchange", () => {
    if (state.host) { try { ensureHost(); } catch (_) {} }
  });

  /* <video> morto: a página reciclou/removeu o elemento (SPA do YouTube faz isso o tempo todo).
     Sem isso o drag "trava" no canto: rect zerado → clamp força (0,0) e nunca sai. */
  const videoGone = (v) => {
    try {
      if (!v || !v.isConnected) return true;
      const r = v.getBoundingClientRect();
      return r.width < 150 || r.height < 90;
    } catch (_) { return true; }
  };

  function place(videoEl, followScroll = false) {
    if (!fabOn()) return false;
    const owner = videoEl.closest(YT_CARD_SEL) || videoEl;
    if (!followScroll && state.fabOwner === owner && state.fab?.style.display === "inline-flex") return true;
    const rect = videoEl.getBoundingClientRect();
    if (!rect || rect.width < 150 || rect.height < 90) return false;
    if (rect.bottom < 0 || rect.top > innerHeight) return false;
    /* card = canto fixo da miniatura: nada de posição salva — a mesma razão em âncoras de
       tamanhos diferentes era o que fazia o ícone "pegar uma posição e pular" depois.
       No player principal a posição arrastada segue valendo (e o 1º place espera o storage). */
    const isCard = !!(state.cardEl && videoEl === state.cardEl);
    if (!state.posReady) {          // storage ainda não voltou: posiciona 1x quando voltar — sem o "aparece e se desloca"
      state.pendingAnchor = videoEl;
      return true;
    }
    if (!ensureHost()) return false;

    const f = state.fab;
    f.style.display = "inline-flex";
    f.style.width = `${FAB_SIZE}px`;
    f.style.height = `${FAB_SIZE}px`;

    const availW = Math.max(0, rect.width - FAB_SIZE);
    const availH = Math.max(0, rect.height - FAB_SIZE);

    let pos = isCard ? state.cardPos : state.pos;
    if (!pos) {
      const dTop = rect.top + (isCard || rect.height < 140 ? 8 : (isYT() ? 62 : 12));   // card/miniatura baixa: canto superior; player alto: abaixo da barra do YT
      const dLeft = isCard ? rect.left + 8 : rect.right - FAB_SIZE - 12;
      pos = [
        Math.min(1, Math.max(0, (dLeft - rect.left) / Math.max(1, availW))),
        Math.min(1, Math.max(0, (dTop - rect.top) / Math.max(1, availH)))
      ];

    }

    let left = rect.left + pos[0] * availW;
    let top = rect.top + pos[1] * availH;

    // não deixa o ícone sair da tela (vídeo cortado/rolado)
    left = Math.min(Math.max(8, left), Math.max(8, innerWidth - FAB_SIZE - 8));
    top = Math.min(Math.max(8, top), Math.max(8, innerHeight - FAB_SIZE - 8));

    state.fabOwner = owner;
    f.style.left = `${Math.round(left)}px`;
    f.style.top = `${Math.round(top)}px`;

    if (state.panelOpen) positionPanel();
    return true;
  }

  function positionPanel() {
    const f = state.fab;
    const anchor = { left:f.offsetLeft, right:f.offsetLeft + f.offsetWidth, top:f.offsetTop };
    const p = state.panel;
    const w = p.offsetWidth;
    const gap = 8;
    const h = p.offsetHeight || 240;

    let l = anchor.left - w - gap;
    if (l < 8) l = anchor.right + gap;
    l = Math.max(8, Math.min(l, innerWidth - w - 8));

    let t = anchor.top;
    if (t + h > innerHeight - 8) t = innerHeight - h - 8;
    t = Math.max(8, t);

    p.style.left = `${Math.round(l)}px`;
    p.style.top = `${Math.round(t)}px`;
  }

  function cardHovered() {                        // cursor segue dentro do card ancorado (a miniatura é filha dele)
    const c = state.cardEl && state.cardEl.closest ? state.cardEl.closest(YT_CARD_SEL) : null;
    return !!(c && c.matches(":hover"));
  }

  function scheduleHide() {
    clearTimeout(state.hideT);
    state.hideT = setTimeout(() => {
      if (state.panelOpen) return;
      if (state.fab && state.fab.matches(":hover, :focus-visible")) return;
      if (cardHovered()) return;
      hideFab();
    }, 700);
  }

  function armIdle() {
    clearTimeout(state.idleT);
    state.idleT = setTimeout(() => {
      if (state.panelOpen || state.dragging) return;
      if (state.fab && (state.fab.matches(":hover, :focus-visible") || state.panel.matches(":hover"))) return;
      if (cardHovered()) return;                  // FAB ancorado no card não some enquanto o usuário mira nele
      hideFab();
    }, 2000);
  }

  function hideFab() {
    if (state.fab) state.fab.style.display = "none";
  }

  function openPanel() {
    const p = state.panel;
    positionPanel();
    // morph: o painel cresce a partir do centro do FAB — origem = botão relativo ao painel posicionado
    const pl = parseFloat(p.style.left) || 0, pt = parseFloat(p.style.top) || 0;
    p.style.transformOrigin = `${Math.round(state.fab.offsetLeft + state.fab.offsetWidth / 2 - pl)}px ${Math.round(state.fab.offsetTop + state.fab.offsetHeight / 2 - pt)}px`;
    p.classList.add("is-open");
    state.panelOpen = true;
    state.fab.setAttribute("aria-expanded", "true");
    p.querySelector("[data-quality]")?.focus({preventScroll:true});
    if (state.fab) state.fab.classList.add("morphed");   // o botão vira o painel: some junto
  }

  function closePanel(restoreFocus = false) {
    state.fab?.setAttribute("aria-expanded", "false");
    if (restoreFocus) state.fab?.focus({preventScroll:true});
    state.panelOpen = false;
    if (state.panel) state.panel.classList.remove("is-open");
    if (state.fab) state.fab.classList.remove("morphed");
  }

  /* ------------------------------------------------------------------ drag -- */
  function onFabDown(e) {
    if (!e.isTrusted || e.button !== 0) return;      // evento fabricado pela página não vale
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(state.idleT);
    clearTimeout(state.hideT);

    const fab = state.fab;
    const startX = e.clientX;
    const startY = e.clientY;
    const fr = fab.getBoundingClientRect();
    const offX = e.clientX - fr.left;
    const offY = e.clientY - fr.top;

    state.dragging = true;
    state.dragMoved = false;
    fab.style.cursor = "grabbing";

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!state.dragMoved && Math.abs(dx) + Math.abs(dy) < 4) return;
      state.dragMoved = true;
      if (Math.abs(dx) + Math.abs(dy) >= 10) state.dragBig = true;   // arrasto de verdade: só isso vira posição salva

      const anc = state.video || state.cardEl;
      const vr = videoGone(anc) ? null : anc.getBoundingClientRect();                  // âncora morta não aprisiona o ícone
      let left = ev.clientX - offX;
      let top = ev.clientY - offY;
      if (vr) {
        const maxL = vr.left + Math.max(0, vr.width - FAB_SIZE);
        const maxT = vr.top + Math.max(0, vr.height - FAB_SIZE);
        left = Math.min(Math.max(vr.left, left), maxL);
        top = Math.min(Math.max(vr.top, top), maxT);
      }
      left = Math.min(Math.max(8, left), Math.max(8, innerWidth - FAB_SIZE - 8));       // tela sempre limita
      top = Math.min(Math.max(8, top), Math.max(8, innerHeight - FAB_SIZE - 8));
      fab.style.left = `${Math.round(left)}px`;
      fab.style.top = `${Math.round(top)}px`;
    };

    const up = () => {
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      fab.style.cursor = "grab";
      state.dragging = false;
      if (state.dragBig) savePos();                    // clique com tremidinha não grava posição errada
      state.dragBig = false;
      armIdle();
      setTimeout(() => { state.dragMoved = false; }, 60);
    };

    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
  }

  /* ---------------------------------------------------------------- overlay  */
  document.addEventListener(
    "mouseover",
    (e) => {
      if (!e.isTrusted) return;                        // eventos sintéticos (pageProgramTitle) não devem religar o FAB
      const t = e.target;
      if (!t || t.nodeType !== 1) return;
      const v = t.tagName === "VIDEO" ? t : (t.closest && t.closest("video"));
      if (!v || state.panelOpen || state.dragging) return;
      const card = cardElAt(t);
      state.cardEl = card;
      state.video = card ? null : v;
      publish(false);
      if (!fabOn()) { hideFab(); return; }
      clearTimeout(state.hideT);
      loadPos();
      if (place(card || v)) armIdle();
      else hideFab();
    },
    true
  );

  let vidCache = [];
  let vidCacheAt = 0;
  function allVideos() {
    const n = Date.now();
    if (n - vidCacheAt < 700) return vidCache;
    vidCacheAt = n;
    const out = new Set(document.querySelectorAll("video"));
    try {
      // players feitos com web components escondem o <video> dentro de um shadowRoot aberto
      const walk = (root, depth) => {
        if (depth > 4) return;
        root.querySelectorAll("*").forEach((el) => {
          const sr = el.shadowRoot;
          if (!sr) return;
          sr.querySelectorAll("video").forEach((v) => out.add(v));
          walk(sr, depth + 1);
        });
      };
      walk(document, 0);
    } catch (_) {}
    vidCache = Array.from(out);
    return vidCache;
  }

  /* O <video> do Instagram (e de vários players) fica COBERTO por camadas: o mouse nunca "está sobre" o <video>.
     Por isso acha o vídeo pela POSIÇÃO do ponteiro, não pelo alvo do evento. */
  // O vídeo vertical (G1, Reels, Shorts) é uma faixa estreita dentro de um player largo: o resto é fundo preto do
  // container. A área "do vídeo" inclui essa moldura (o ancestral próximo que o contém e não é muito maior).
  function hitRect(v) {
    const r = v.getBoundingClientRect();
    const va = r.width * r.height;
    let box = r;
    let el = v.parentElement;
    for (let d = 0; el && d < 4; d++, el = el.parentElement) {
      const pr = el.getBoundingClientRect();
      const pa = pr.width * pr.height;
      if (pa > va * 5 || pr.width > innerWidth * 0.98) break;
      if (pr.left <= r.left + 1 && pr.right >= r.right - 1 && pr.top <= r.top + 1 && pr.bottom >= r.bottom - 1) box = pr;
    }
    return box;
  }

  function videoAt(x, y) {
    let best = null;
    let area = Infinity;
    allVideos().forEach((v) => {
      const r = v.getBoundingClientRect();
      if (r.width < 150 || r.height < 90) return;
      const h = hitRect(v);
      if (x < h.left || x > h.right || y < h.top || y > h.bottom) return;
      const a = h.width * h.height;
      if (a < area) { best = v; area = a; }
    });
    return best;
  }

  const YT_CARD_SEL = "ytd-rich-item-renderer, ytd-rich-grid-media, yt-lockup-view-model, ytd-video-renderer, ytd-compact-video-renderer, ytm-shorts-lockup-view-model, ytd-grid-video-renderer, ytd-reel-item-renderer";
  /* Card do YouTube sob o cursor em página de lista (home/Ao vivo/busca/canal). A aba "Ao vivo"
     não solta preview de vídeo no hover, então um FAB que só ancora em <video> nunca aparecia. */
  function cardElAt(t) {
    if (!isYT()) return null;                          // /watch também: os cards da lateral são ytd-compact-video-renderer
    const c = t && t.closest && t.closest(YT_CARD_SEL);
    if (!c) return null;
    if (!c.querySelector('a[href*="/watch"],a[href*="/live/"],a[href*="/shorts/"],a[href*="/clip/"]')) return null;
    return c.querySelector("ytd-thumbnail, #thumbnail") || c;   // âncora = a MINIATURA: o FAB fica no canto da imagem, não em cima do título
  }

  document.addEventListener(
    "mousemove",
    (e) => {
      if (state.panelOpen || state.dragging || !fabOn() || !e.isTrusted) return;   // sintético não ancora nem acorda o FAB
      const n = Date.now();
      if (n - state.lastMove < 110) return;
      state.lastMove = n;
      if (e.target === state.host) return;

      const c = cardElAt(e.target);          // card PRIMEIRO: a âncora é sempre a miniatura — o <video> de preview
      if (c) {                               // nasce dentro do mesmo card e não arranca o FAB do lugar (era o "pulando")
        if (c !== state.cardEl && state.panelOpen) return;   // painel aberto não troca de alvo no meio
        state.video = null;
        state.cardEl = c;
        clearTimeout(state.hideT);
        loadPos();
        if (place(c)) { armIdle(); return; }
        state.cardEl = null;
      }
      const v = videoAt(e.clientX, e.clientY);
      if (!v) {
        state.cardEl = null;
        if (state.fab && state.fab.style.display === "inline-flex" && !state.panelOpen) scheduleHide();
        return;
      }
      state.cardEl = null;
      if (v !== state.video) {
        if (state.panelOpen) return;              // não troca de vídeo com o menu aberto
        state.video = v;
        publish(true);
      }
      clearTimeout(state.hideT);
      loadPos();
      if (!state.panelOpen) {
        if (place(v)) armIdle();
        else hideFab();
      }
    },
    true
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      if (!e.isTrusted) return;
      const t = e.target;
      if (!t || t.nodeType !== 1) return;
      const v = t.tagName === "VIDEO" ? t : (t.closest && t.closest("video"));
      if (!v) return;
      if (e.relatedTarget === state.host) return;
      const card = state.cardEl && state.cardEl.closest ? state.cardEl.closest(YT_CARD_SEL) : null;
      if (card && card.matches(":hover")) return;   // saiu do <video> de preview mas segue no card: o FAB fica
      scheduleHide();
    },
    true
  );

  let scrollRaf = 0;
  window.addEventListener("scroll", () => {
    if (state.dragging || scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {       // no máximo 1 reposicionamento por quadro
      scrollRaf = 0;
      const anc = state.video || state.cardEl;
      if (anc && state.fab && state.fab.style.display === "inline-flex") {
        if (place(anc, true)) armIdle();
        else hideFab();                       // âncora sumiu/saiu da tela: ícone órfão não fica flutuando
      } else if (state.fab && state.fab.style.display === "inline-flex" && videoGone(anc)) {
        hideFab();
      }
    });
  }, { passive: true });

  // painel fecha ao clicar fora ou com Esc
  document.addEventListener("pointerdown", (e) => {
    if (state.panelOpen && e.target !== state.host) { closePanel(); scheduleHide(); }
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.panelOpen) { e.preventDefault(); e.stopPropagation(); closePanel(true); }
  }, true);

  /* --------------------------------------------------------------- painel UI */
  function renderPanel() {
    const cfg = state.cfg || {};
    const dest = cfg.output_dir || "";
    const direct = cfg.hover_action === "direct";
    const quality = cfg.default_quality || "best";
    const on = cfg.fab_enabled !== false;

    state.panel.innerHTML = `
      <div class="head">
        ${BRAND_SVG}
        <b>${t("saveVideo")}</b>
        <span class="brand">NOÉ VFX</span>
        <button type="button" class="x" data-x aria-label="${esc(t("cancel"))}" title="${esc(t("cancel"))}">✕</button>
      </div>
      <div class="dest">
        <span>📁</span>
        <span class="path" title="${esc(dest)}">${esc(dest ? folderName(dest) : t("folderLabel"))}</span>
        <button type="button" class="change">${t("change")}</button>
      </div>
      <label style="display:block;font-size:11px;color:#a4afc4;margin-bottom:8px">Qualidade do vídeo<select data-quality style="display:block;width:100%;margin-top:5px;padding:8px;border:1px solid #303747;border-radius:7px;background:#1b1f29;color:#f1f4fa;font:inherit"><option value="best">Nativa · Máxima disponível</option><option value="1080">1080p · Full HD</option><option value="720">720p · HD</option></select></label>
      <div class="grid">
        <button type="button" class="opt main" data-q="selected">
          ${direct ? t("saveHere") : t("downloadDefault")}
        </button>
        <button type="button" class="opt audio-choice" data-audio>Escolher formato de áudio…</button>
      </div>
      ${globalThis.NVF_EDITION !== "basic" && /Windows|Macintosh|Mac OS X/i.test(navigator.userAgent) ? `<div class="send-h">${t("sendTo")}</div><div class="send">
        <button type="button" class="pr" data-target="premiere" title="${esc(t("sendTip"))}"><b>Pr</b><span>${t("sendPr")}</span></button>
        <button type="button" class="ae" data-target="aftereffects" title="${esc(t("sendTip"))}"><b>Ae</b><span>${t("sendAe")}</span></button>
      </div>` : ""}
      ${globalThis.NVFCollection && NVFCollection.playlistUrl(location.href,true) ? '<div class="all"><button type="button" class="playlist-btn all-btn">Ver playlist deste vídeo…</button></div>' : ''}
      <div class="all"><button type="button" class="page-btn all-btn">Escolher vídeos desta página…</button></div>
      ${globalThis.NVF_EDITION === "basic" ? "" : `<label class="compat" title="${esc(t("compatTip"))}"><input type="checkbox" data-compat ${cfg.compat_h264 === true ? "checked" : ""}><span>${t("compatShort")}</span></label>`}
      <div class="foot">
        <span class="hint">${t("dragHint")}</span>
        <button type="button" class="tgl ${on ? "" : "off"}" data-toggle>${on ? t("iconOn") : t("iconOff")}</button>
      </div>
    `;

    state.panel.querySelector("[data-x]").addEventListener("click", (e) => {
      e.stopPropagation(); if (!e.isTrusted) return;
      closePanel(true);                       // ✕ explícito: clicar fora não é obrigatório
    });
    state.panel.querySelector("[data-quality]").value = quality === "audio" ? "best" : quality;
    state.panel.querySelector("[data-quality]").addEventListener("click", e=>e.stopPropagation());
    state.panel.querySelector("[data-audio]").addEventListener("click",e=>{e.stopPropagation();if(!e.isTrusted)return;closePanel();hideFab();startOne("best","",true);});
    const playlistButton=state.panel.querySelector(".playlist-btn");
    if(playlistButton)playlistButton.addEventListener("click",e=>{e.stopPropagation();if(!e.isTrusted)return;sendMsg({type:"OPEN_COLLECTION",seed:{url:NVFCollection.playlistUrl(location.href,true)}});closePanel();});

    state.panel.querySelector(".change").addEventListener("click", (e) => {
      e.stopPropagation();
      if (!e.isTrusted) return;
      try { chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }); } catch (_) {}
      closePanel();
    });

    state.panel.querySelectorAll("button[data-q]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!e.isTrusted) return;
        closePanel();
        hideFab();
        startOne(state.panel.querySelector("[data-quality]").value);
      });
    });

    state.panel.querySelectorAll("button[data-target]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!e.isTrusted) return;
        closePanel();
        hideFab();
        startOne(state.panel.querySelector("[data-quality]").value, b.dataset.target);
      });
    });

    state.panel.querySelectorAll(".page-btn").forEach((b) => b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!e.isTrusted) return;
      closePanel();
      hideFab();
      const found=scan().items;
      // página com playlist (watch?v&list= ou /playlist): manda a URL — a janela lê e lista todos os itens.
      // página de vídeo comum sem playlist: manda o próprio vídeo, para a janela nunca abrir vazia.
      const pl = globalThis.NVFCollection ? NVFCollection.playlistUrl(location.href, true) : "";
      const pg = !pl && isYT() && ytId() ? location.href : "";
      await sendMsg({type:"OPEN_COLLECTION",seed:{url:pl||pg,items:found.map(it=>({url:it.url,title:it.title||"",referer:location.href})),quality:state.panel.querySelector("[data-quality]").value}});
    }));

    if (state.panel.querySelector("[data-compat]")) state.panel.querySelector("[data-compat]").addEventListener("change", async (e) => {
      e.stopPropagation();
      if (!e.isTrusted) return;
      const r = await sendMsg({ type: "SAVE_CONFIG", patch: { compat_h264: e.target.checked } });
      if (r && r.ok && r.config) state.cfg = r.config;
      else e.target.checked = !e.target.checked;
    });
    if (state.panel.querySelector("[data-compat]")) state.panel.querySelector("[data-compat]").addEventListener("click", (e) => e.stopPropagation());

    state.panel.querySelector("[data-toggle]").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!e.isTrusted) return;
      const turningOn = !on;
      const r = await sendMsg({ type: "SAVE_CONFIG", patch: { fab_enabled: turningOn } });
      if (r && r.ok && r.config) state.cfg = r.config;
      if (!turningOn) {
        closePanel();
        hideFab();
        return;
      }
      renderPanel();
      openPanel();
    });
  }

  function onFabClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.isTrusted) return;                        // clique sintético (da página) não baixa nada
    if (state.dragMoved) return;
    if (!fabOn()) return;

    const cfg = state.cfg || {};
    const wantsMenu = cfg.hover_action !== "direct" || e.altKey || e.shiftKey || e.ctrlKey || e.metaKey;
    if (!wantsMenu) {
      hideFab();
      startOne(cfg.default_quality || "best");
      return;
    }
    if (state.panelOpen) { closePanel(); return; }
    renderPanel();
    openPanel();
    publish(true);
  }

  /* --------------------------------------------------------------- downloads */
  // A pilula é um mini centro de downloads: com jobs ativos mostra etapa/fila/cancelar;
  // sem jobs, exibe o aviso transitório de sempre (toast).
  const CHECK_SVG = '<svg viewBox="0 0 48 48" fill="none"><path d="M10 26l9 9 19-22" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function mkCheck() {                                   // success-check: o ✓ desenha na entrada do aviso "salvo"
    const s = document.createElement("span");
    s.className = "t-check"; s.dataset.state = "in"; s.setAttribute("aria-hidden", "true");
    s.innerHTML = CHECK_SVG;
    return s;
  }
  function toast(text, kind, ms) {
    if (!ensureHost()) return;
    state.notice = { text: String(text), kind: kind || "", until: ms === 0 ? Infinity : Date.now() + (ms || 4200) };
    clearTimeout(state.toastT);
    if (ms !== 0) state.toastT = setTimeout(renderJobs, ms || 4200);     // re-renderiza: esconde o aviso expirado
    renderJobs();
  }

  const ACTIVE_J = new Set(["queued", "downloading", "merging", "stopping"]);

  function jobName(j) {
    const ttl = String(j.title || "").replace(/^\(\d+\)\s*/, "").trim();   // "(2) YouTube" → "YouTube"
    if (ttl) return ttl.slice(0, 64);
    try { return new URL(j.url || "").hostname.replace(/^www\./, ""); } catch (_) { return "download"; }
  }

  function stageLine(j) {
    if (j.status === "queued") return t("queuedWait");
    if (j.status === "merging") return t("mergingShort");
    if (j.status === "stopping") return j.live ? t("stoppingSave") : t("canceling");
    if (j.status === "downloading") {
      if (j.live) {                                   // live não tem %: mostra tempo gravado — o botão é o "parar e salvar"
        const s = Math.max(0, Math.round(Date.now() / 1000 - (j.started || Date.now() / 1000)));
        return t("recordingFor", s >= 60 ? `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s` : `${s}s`);
      }
      const p = String(j.progress || "");
      if (/^\d+(\.\d+)?%$/.test(p)) return t("downloadingP", p + (j.speed ? " • " + j.speed : ""));
      if (p) return p;                                  // "unindo", "convertendo para H.264 45%", "tentando modo compatível"... vem pronto do servidor
      return t("downloading0");
    }
    if (j.status === "done") return t("savedInShort", folderName(j.output_dir || "") || "✓");
    if (j.status === "canceled") return t("canceledMsg");
    if (j.status === "error") return t("errShort", String(j.error || "-").slice(0, 90));
    return String(j.status || "");
  }

  function showToastMessage(container, note) {
    const message = document.createElement("span");
    message.className = "toast-message";
    const label = document.createElement("span");
    label.className = "toast-message-text";
    label.textContent = note.text;
    message.title = note.text;
    if (note.kind === "ok") message.appendChild(mkCheck());
    message.appendChild(label);
    container.replaceChildren(message);
  }

  function renderJobs() {
    const jobs = state.jobs || [];
    const el = (state.toastEl && state.toastEl.isConnected) ? state.toastEl
             : (jobs.length ? ensureHost() && state.toastEl : null);   // recém-carregada (ou página que removeu o host): remonta a pilula
    if (!el) return;
    const wasOpen = el.classList.contains("is-open");   // lê ANTES: o className é reconstruído abaixo e apagaria a marca
    tickLive();                                   // relógio da live anda a cada segundo, independente do poll
    if (jobs.some(j => !state.jobRows.has(j.id)) && !state.notice?.kind) state.notice = null;
    const note = state.notice && state.notice.until > Date.now() ? state.notice : null;
    if (!jobs.length) {
      el.dataset.mode = "";
      state.jobRows.clear();
      pendingStop.clear();                            // lista esvaziou: nenhum "parando" fica pendurado
      state.jobsOpen = false;
      el.className = "toast" + (wasOpen ? " is-open" : "") + (note && note.kind ? " " + note.kind : "");
      if (note) {
        if (el._note !== note) {                        // aviso novo: monta UMA vez (o ✓ e o shake não repetem a cada poll)
          el._note = note;
          showToastMessage(el, note);
          if (note.kind === "err" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
            // error-shake via WAAPI: classe não presta aqui — o className é reconstruído a cada poll e truncaria o tremor
            const cs = getComputedStyle(el);
            const num = (n, fb) => { const v = parseFloat(cs.getPropertyValue(n)); return Number.isFinite(v) ? v : fb; };
            const ease = cs.getPropertyValue("--shake-ease").trim() || "cubic-bezier(.22,1,.36,1)";
            const d = num("--shake-distance", 6), o = num("--shake-overshoot", 4);
            el.animate([
              { translate: "0 0", easing: ease, offset: 0 },
              { translate: `${d}px 0`,  easing: ease, offset: 0.2857 },
              { translate: `-${d}px 0`, easing: ease, offset: 0.5714 },
              { translate: `${o}px 0`,  easing: ease, offset: 0.7857 },
              { translate: "0 0", offset: 1 },
            ], { duration: num("--shake-dur", 280) });
          }
        }
        if (!wasOpen) void el.offsetWidth;   // pinta o fechado 1º: a animação de surgir roda na abertura (não a cada poll)
        el.classList.add("is-open");
      } else { el._note = null; el.classList.remove("is-open"); }
      applyToastPos();
      return;
    }
    if (el.dataset.mode !== "jobs") {                   // monta o esqueleto do widget uma vez por sessão de jobs
      el.dataset.mode = "jobs";
      el._note = null;                                  // note antigo não vale mais: ao voltar sem jobs, remonta do zero
      el._noteTxt = null;                               // mesma coisa pro rodapé .j-note (remonta o ✓ junto)
      state.jobRows.clear();
      el.innerHTML = `<div class="j-sum" role="button" tabindex="0"><svg class="j-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="m2 11 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="j-sumtxt"><span class="j-dot" style="display:none"></span><span class="j-sumt"></span></span></div><div class="j-list t-stack"></div><div class="j-note"></div>`;
      const sum = el.querySelector(".j-sum");
      const toggle = () => { if (state.toastMoved) return; state.jobsOpen = !state.jobsOpen; renderJobs(); };
      sum.addEventListener("click", (event) => { event.stopPropagation(); toggle(); });
      el.querySelector(".j-list").addEventListener("click", (event) => {
        if (!event.target.closest("button") && state.jobs.length > 1) toggle();
      });
      sum.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
    }
    const single = jobs.length === 1;
    if (single) state.jobsOpen = false;                   // 1 job: a linha É a pilula — sem cabeçalho duplicado nem expandir
    el.className = "toast jobs" + (wasOpen ? " is-open" : "") + ((state.jobsOpen && !single) ? " spread" : "") + (note && note.kind ? " " + note.kind : "");
    const sum = el.querySelector(".j-sum");
    sum.style.display = single ? "none" : "";
    sum.title = t("toggleJobs");
    sum.setAttribute("aria-label", sum.title);
    sum.setAttribute("aria-expanded", String(!single && state.jobsOpen));
    const qd = jobs.filter(j => j.status === "queued").length;
    const act = jobs.length - qd;
    el.querySelector(".j-dot").style.display = jobs.some(j => j.live) ? "" : "none";   // live rolando: bolinha pulsando (nó fixo, não reinicia)
    el.querySelector(".j-sumt").textContent = `${act ? t("runningN", act) : ""}${act && qd ? " · " : ""}${qd ? t("queuedN2", qd) : ""}`;
    const list = el.querySelector(".j-list");
    // Retire os nós encerrados antes de reordenar: o vizinho conserva seu transform inicial.
    for (const [id, row] of state.jobRows) {
      if (!jobs.some(job => job.id === id)) { row.remove(); state.jobRows.delete(id); pendingStop.delete(id); }
    }
    jobs.forEach((job, i) => {
      const j = pendingStop.has(job.id) && !job.finalText ? {...job, status:"stopping"} : job;
      //   // cancel já clicado: segura o estado até o servidor confirmar
      let row = state.jobRows.get(j.id);
      if (!row) {
        row = document.createElement("div");
        row._enter = true;                              // banner-stacking: card novo sobe 60px ao entrar (reflow+release no fim)
        // slots persistentes dentro de .j-stage: shimmer/pulse/dots são CSS-animation — nó criado 1x não reinicia a cada poll
        row.innerHTML = `<div class="j-cell"><div class="j-name"></div><div class="j-stage"><span class="j-live" style="display:none"><i></i><span class="j-shim"></span></span><span class="j-txt"></span><span class="j-dots" style="display:none"><i></i><i></i><i></i></span></div><div class="j-bar"><i></i></div></div><button type="button" class="j-x">✕</button>`;
        const armedAt = performance.now();     // guarda anti-fantasma: clique nos primeiros 400ms = linha recém-materializada sob o cursor
        row.querySelector(".j-x").addEventListener("click", (e) => {
          e.stopPropagation();
          if (!e.isTrusted) return;                          // mesmo padrão dos demais botões: evento sintético nunca cancela
          if (performance.now() - armedAt < 400) return;
          pendingStop.add(j.id);               // marca até o servidor confirmar — o poll traz "downloading" ainda e reverteria a tela
          setTimeout(() => { if (pendingStop.delete(j.id)) renderJobs(); }, 90000);   // trava total: solta a linha em 90s
          renderJobs();
          sendMsg({ type: "CANCEL", jobId: j.id, src: "pill" }, 50000).then(async (r) => {   // ≥ timeout do background (45s): parada+resgate podem demorar
            if (r && r.ok) return;
            while (jobsPolling) await new Promise((x) => setTimeout(x, 60));   // espera o poll em voo antes de julgar
            await pollJobs();                  // recusado: o job pode ter acabado sozinho — reconfere a verdade
            if (!(state.jobs || []).find((x) => x.id === j.id)) return;   // saiu da lista = já tinha terminado
            pendingStop.delete(j.id);          // falhou de verdade: tira o "stopping" e devolve o botão pra tentar de novo
            if (!(r && r.stale)) { row._errorUntil = Date.now() + 5000; }   // stale = contexto morto; o aviso de F5 já aparece
            renderJobs();
          }).catch(() => {});
        });
        state.jobRows.set(j.id, row);
      }
      row.className = "j-row t-stack-banner" + (j.retiring ? " retiring" : "") + (j.live ? " live" : "") + (row._enter ? " is-enter" : "");
      row.style.setProperty("--layer", String(i));
      row.inert = i > 0 && !state.jobsOpen;
      row.dataset.depth = String(i);                        // banner-stacking: frente visível, próximos espiam por cima
      const x = row.querySelector(".j-x");     // o botão guarda a classe .j-x pra sempre — trocar className inteiro quebrava o seletor e matava o render
      if (j.live && j.status !== "queued") { x.textContent = t("stopSave"); x.classList.add("j-stop"); x.title = t("stopSave"); }
      else { x.textContent = "✕"; x.classList.remove("j-stop"); x.title = t("cancel"); }   // live na fila ainda não grava nada: ✕ simples
      const stopping = j.status === "stopping" || (j.live && j.status === "merging");   // merging em live = resgate rodando: clicar mataria o salvamento
      x.style.pointerEvents = stopping ? "none" : "";
      x.style.opacity = stopping ? ".45" : "";
      x.disabled = stopping || !!j.finalText;                             // pointerEvents não cobre teclado (Enter/Espaço no botão focado)
      row.querySelector(".j-name").textContent = jobName(j);
      const st = row.querySelector(".j-stage");
      const txt = st.querySelector(".j-txt"), line = j.finalText || (row._errorUntil > Date.now() ? t("cancelFail") : stageLine(j));
      if (j.status === "stopping") {                    // shimmer no "parando e salvando" + pontinhos do processo
        txt.classList.add("j-shim");
        if (txt.textContent !== line) { txt.textContent = line; txt.dataset.text = line; }
        st.querySelector(".j-dots").style.display = "";
      } else {
        if (txt.classList.contains("j-shim")) { txt.classList.remove("j-shim"); delete txt.dataset.text; }
        if (txt.textContent !== line) txt.textContent = line;
        st.querySelector(".j-dots").style.display = "none";
      }
      const b = st.querySelector(".j-live");            // selo ● AO VIVO antes do "gravando há Xmin" — nó fixo: shimmer contínuo
      b.style.display = j.live && !j.finalText ? "" : "none";
      if (j.live) {
        const sh2 = b.querySelector(".j-shim"), lb = t("liveBadge");
        if (sh2.textContent !== lb) { sh2.textContent = lb; sh2.dataset.text = lb; }
      }
      const pct = j.live ? NaN : parseFloat(j.progress);    // live: barra de % não faz sentido
      row.querySelector(".j-bar").style.display = isFinite(pct) ? "" : "none";
      if (isFinite(pct)) row.querySelector(".j-bar i").style.width = Math.min(100, pct) + "%";
      if (i === 0 && sum.parentNode !== row) row.appendChild(sum);
      if (list.children[i] !== row) list.insertBefore(row, list.children[i] || null);                            // reanexa na ordem da fila
      if (row._enter) row._enter = false;   // pinta o "debaixo" 1º, solta no mesmo tick — o card sobe animado
    });

    const noteEl = el.querySelector(".j-note");
    const noteTxt = note ? note.text : null;
    if ((el._noteTxt || null) !== noteTxt) {            // aviso mudou: remonta (o ✓ verde não repete a cada poll)
      el._noteTxt = noteTxt;
      if (note) showToastMessage(noteEl, note);
      else noteEl.replaceChildren();
    }
    noteEl.className = "j-note" + (note ? " on" : "");
    if (!wasOpen) void el.offsetWidth;
    el.classList.add("is-open");
    applyToastPos();
  }

  // um poller por aba: acompanha os jobs do navegador (não os envios Adobe nem os itens de listas)
  let jobsPoll = 0, jobsMisses = 0, liveTick = 0, jobsPolling = false;
  const pendingStop = new Set();               // ids com cancel clicado aguardando o servidor confirmar "stopping"
  const finishingJobs = new Map();
  function finishInCard(job, text) {
    if (finishingJobs.has(job.id)) return;
    const card = {...job, finalText:text};
    finishingJobs.set(job.id, card);
    pendingStop.delete(job.id);
    setTimeout(() => {
      if (finishingJobs.get(job.id) !== card) return;
      card.retiring = true;
      renderJobs();
      const duration = parseFloat(getComputedStyle(state.toastEl).getPropertyValue("--stack-close")) || 250;
      setTimeout(() => {
        if (finishingJobs.get(job.id) !== card) return;
        finishingJobs.delete(job.id);
        state.jobs = state.jobs.filter(j => j.id !== job.id);
        renderJobs();
      }, duration);
    }, job.warning || job.status === "error" ? 5000 : 1500);
  }
  const jobsGone = new Map();                  // id -> polls seguidos sem o job na lista (servidor reiniciou = zumbi)
  function tickLive() {                        // repinta "gravando há Xs" a cada segundo enquanto houver live ativa
    const on = (state.jobs || []).some((j) => j.live && j.status === "downloading");
    if (on && !liveTick) liveTick = setInterval(() => { try { renderJobs(); } catch (_) {} }, 1000);
    if (!on && liveTick) { clearInterval(liveTick); liveTick = 0; }
  }
  function ensurePoll() { if (!jobsPoll) jobsPoll = setInterval(pollJobs, 800); }
  function trackJob(jobId, folder, done) {
    state.trackedJobs.set(jobId, { folder, done });
    ensurePoll();
  }
  async function pollJobs() {
    if (jobsPolling) return;                   // servidor lento: não empilha uma requisição sobre a outra
    jobsPolling = true;
    try {
      let r;
      try { r = await sendMsg({ type: "JOBS" }); } catch (_) { r = null; }
      if (r && r.stale) {                      // extensão recarregada: esta aba está morta — para tudo
        clearInterval(jobsPoll); jobsPoll = 0;
        state.trackedJobs.clear();
        finishingJobs.clear();
        state.jobs = [];
        pendingStop.clear();
        staleNotice();
        return;
      }
      if (!r || !r.ok || !r.data) {
        jobsMisses++;
        if (jobsMisses === 3) {                // servidor caiu: avisa UMA vez e esconde a lista…
          state.jobs = [];
          finishingJobs.clear();
          pendingStop.clear();
          renderJobs();
          toast(t("serverOffline"), "err");
        }
        return;                                // …mas nunca morre: servidor voltou, a pilula volta junto
      }
      jobsMisses = 0;
      const jobs = Array.isArray(r.data.jobs) ? r.data.jobs : [];
      for (const [id, tr] of state.trackedJobs) {
        const j = jobs.find((x) => x.id === id);
        if (!j) {
          const gone = (jobsGone.get(id) || 0) + 1;   // servidor vivo mas o job sumiu = zumbi de reinício
          if (gone >= 10) {
            jobsGone.delete(id);
            state.trackedJobs.delete(id);
            try { tr.done && tr.done(); } catch (_) {}
            toast(t("jobsLost"), "err", 6000);
          } else jobsGone.set(id, gone);
          continue;
        }
        jobsGone.delete(id);
        const fin = (kind, text, ms) => { if (state.jobs.some(job => job.id === id)) finishInCard(j, text); else toast(text, kind, ms); state.trackedJobs.delete(id); try { tr.done && tr.done(); } catch (_) {} };
        if (j.status === "done") fin("ok", t("savedInShort", folderName(tr.folder || j.output_dir || "")) + (j.warning ? " — " + t("ffWarn") : ""), j.warning ? 9000 : 6000);
        else if (j.status === "canceled") fin(null, t("canceledMsg"), 3500);
        else if (j.status === "error") fin("err", t("errShort", String(j.error || "-").slice(0, 90)), 7000);
      }
      for (const previous of state.jobs) {
        if (finishingJobs.has(previous.id)) continue;
        const latest = jobs.find(job => job.id === previous.id);
        if (latest && ["done","canceled","error"].includes(latest.status)) finishInCard(latest, stageLine(latest));
        else if (!latest && pendingStop.has(previous.id)) {
          finishInCard({...previous,status:"canceled"}, t("canceledMsg"));
          const tracked = state.trackedJobs.get(previous.id);
          state.trackedJobs.delete(previous.id);
          jobsGone.delete(previous.id);
          try { tracked?.done?.(); } catch (_) {}
        }
      }
      state.jobs = jobs.filter((j) => ACTIVE_J.has(j.status) && !finishingJobs.has(j.id) && !j.import_app && !j.batch)
        .concat([...finishingJobs.values()])
        .sort((a, b) => (b.created || 0) - (a.created || 0));
      renderJobs();
      if (!state.trackedJobs.size && !state.jobs.length) { clearInterval(jobsPoll); jobsPoll = 0; }
    } finally {
      jobsPolling = false;
    }
  }

  // HLS/DASH mais "mestre" que o player pediu (a playlist principal, não a de uma única qualidade "...-video=1320960.m3u8")
  function liveStream() {
    const hls = netList.filter((u) => /\.(m3u8|mpd)(\?|#|$)/i.test(u));
    if (!hls.length) return "";
    const master = hls.find((u) => !/[=_]\d+(-|\.)|-(video|audio)=|chunklist|\/(video|audio)_/i.test(u.split("?")[0].split("/").pop()));
    return master || hls[hls.length - 1];
  }

  /* Nome do programa real exibido na página. Streams crus (.m3u8/.mpd) não têm metadados —
     sem isso o arquivo sai com o título da aba ("Assistir X | Site"). Procura no documento
     inteiro e pontua por proximidade do player: o título do programa fica colado nele.
     Overlay de info que só monta no hover (Globoplay "Agora na TV"): simula o mouse sobre
     o player antes de ler — os eventos sintéticos acordam o painel igual um mouse real. */
  async function pageProgramTitle() {
    try {
      const v = state.video;
      if (v && v.isConnected) {
        try {
          const rr = v.getBoundingClientRect();
          const cx = rr.left + rr.width / 2, cy = rr.top + rr.height * 0.8;
          // PointerEvent de verdade + composed: atravessa shadow DOM e carrega pointerType/id
          for (const t of ["pointermove", "pointerover", "mousemove", "mouseover"]) {
            const Ev = t.startsWith("pointer") ? PointerEvent : MouseEvent;
            v.dispatchEvent(new Ev(t, { bubbles: true, composed: true, pointerId: 1, pointerType: "mouse", isPrimary: true, clientX: cx, clientY: cy }));
          }
          document.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true, clientX: cx, clientY: cy }));   // React delega no root
          await new Promise((rs) => setTimeout(rs, 320));
        } catch (_) {}
      }
      const vr = v && v.isConnected ? v.getBoundingClientRect() : null;
      const skip = /^(programa[cç][aã]o|programming|grade|schedule|extras?|menu|in[ií]cio|home|assistir$|watch$|a seguir|up next|pr[oó]ximo|agora na tv|ao vivo|live now|no ar$|on air|an[uú]ncio|publicidade|propaganda|sponsored|patrocin|entrar$|sign in|assine|subscribe|ver tudo|see all|busca$|search$)/i;
      // dados estruturados: sites de TV publicam o nome do programa em JSON-LD — mais confiável que adivinhar classes
      for (const s of document.querySelectorAll("script[type='application/ld+json']")) {
        try {
          const d = JSON.parse(s.textContent || "");
          const list = Array.isArray(d) ? d : [d].concat(d["@graph"] || []);
          for (const it of list) {
            const nm = it && String(it.name || "").trim();
            if (nm.length > 4 && nm.length < 120 && !skip.test(nm) && /video|broadcast|movie|episode|program|event/i.test(it["@type"] || "")) return nm;
          }
        } catch (_) {}
      }
      let best = "", bestScore = 3, bestHidden = "";
      document.querySelectorAll("h1,h2,h3,h4,[role='heading'],[class*='program' i],[class*='broadcast' i],[class*='now-playing' i],[class*='title' i],[data-testid*='title' i]").forEach((e) => {
        const tx = (e.textContent || "").trim().replace(/\s+/g, " ");
        if (tx.length < 5 || tx.length > 110 || skip.test(tx)) return;
        if (e.closest && e.closest("[class*='advert' i],[class*='sponsor' i],[aria-hidden='true'],nav,footer,[role='navigation'],[role='banner']")) return;
        const r = e.getBoundingClientRect();
        const sem = !/^(H[1-4])$/.test(e.tagName);                  // nome semântico na classe: pode estar opacity:0 mas montado
        if (!r.width || !r.height) {
          if (sem && !bestHidden) bestHidden = tx;                  // montado mas invisível: último recurso antes da meta tag
          return;
        }
        let s = e.tagName === "H1" ? 3 : e.tagName === "H2" ? 2 : sem ? 1.5 : 1;
        if (vr && vr.width) {
          const dy = Math.abs((r.top + r.bottom) / 2 - (vr.top + vr.bottom) / 2);
          const horiz = r.left < vr.right && r.right > vr.left;
          if (horiz && dy < vr.height) s += 5;                      // ao lado/abaixo do player = quase certeza
          else s -= Math.min(3, dy / 400);
        }
        if (s > bestScore) { bestScore = s; best = tx; }
      });
      if (best) return best;
      if (bestHidden) return bestHidden;
      const og = document.querySelector('meta[property="og:title"], meta[name="twitter:title"], meta[itemprop="name"], meta[name="title"]');
      if (og && og.content && og.content.trim()) return og.content.trim().slice(0, 120);
    } catch (_) {}
    return "";
  }

  async function startOne(quality, sendTo, chooseAudio) {
    const cfg = state.cfg || {};
    const page = location.href;
    const direct = isLI() ? liMedia(state.video) : (state.video && (state.video.currentSrc || state.video.src)) || "";
    let vids = 1;
    try { vids = document.querySelectorAll("video").length || 1; } catch (_) {}

    let primary = page;
    let fallback = "";
    const manyVideos = vids > 1;
    // YouTube fora do /watch: o vídeo é o do CARD apontado; sem ele, a home do site seria baixada (vídeo qualquer)
    // âncora = o elemento VIVO mais recente: um state.video velho desanexado apontaria pro card errado
    const anchor = (state.cardEl && state.cardEl.isConnected) ? state.cardEl
                 : (state.video && state.video.isConnected) ? state.video : null;
    const cardInfo = isYT() && (state.cardEl || !ytId()) ? ytCardInfo(anchor) : null;   // /watch: resolve o card apontado na lateral; sem card, vale a página
    const isGlobo = /(^|\.)globo\.com$/.test(location.hostname);
    const cardLive = isGlobo && !!state.video && cardIsLive(state.video);   // selo AO VIVO dentro do card do vídeo
    let globoLive = false;                            // globoplay fora de /v/id: a transmissão é live por definição
    const igUrl = state.video ? (isLI() ? liPostUrl(state.video) : isIG() ? igPostUrl(state.video) : isTT() ? ttPostUrl(state.video) : isX() ? xTweetUrl(state.video) : isFB() ? fbVideoUrl(state.video) : isPin() ? pinFeedUrl(state.video) : "") : "";
    if (igUrl) {
      primary = igUrl;
      if ((isTT() || isLI()) && /^https?:/i.test(direct)) fallback = direct;
    }
    else if (cardInfo) {
      primary = cardInfo.url;
    }
    else if (direct && /^https?:/i.test(direct) && !isYT()) {
      if (manyVideos || isGlobo) { primary = direct; fallback = page; }   // na Globo o stream do elemento É o vídeo do card
      else { fallback = direct; }
    }
    if (isLI() && !igUrl) {
      if (!direct) {
        toast(/^pt/i.test(navigator.language) ? "LinkedIn: dê play neste vídeo por alguns segundos e tente novamente. Ainda não consegui identificar a mídia deste post." : "LinkedIn: play this video for a few seconds, then try again. This post's media is not available yet.", "err", 7000);
        return;
      }
      primary = direct;
      fallback = "";
    }
    const holder = !isLI() && !igUrl && state.video && state.video.closest ? state.video.closest("[data-video-id]") : null;
    const hid = holder ? holder.getAttribute("data-video-id") : "";
    if (!igUrl && hid && /^\d{7,}$/.test(hid)) {
      primary = `https://globoplay.globo.com/v/${hid}/`;      // o vídeo que o usuário apontou, não o 1º da página
      fallback = page;
    } else if (!igUrl && hid && /^\d+$/.test(hid)) {
      // id curto (6 dígitos) = AO VIVO: nem a URL do globoplay nem a da matéria servem; vale o HLS que o player pediu
      const live = liveStream();
      if (live) { primary = live; fallback = page; }
    } else if (!igUrl && cardLive) {
      // card AO VIVO sem data-video-id: o mestre HLS pedido pelo player é a transmissão; a matéria só tem clipes
      const live = liveStream() || (/^https?:/i.test(direct) ? direct : "");
      if (live) { primary = live; fallback = page; }
    } else if (!igUrl && isGlobo && state.video) {
      // Globoplay fora de /v/id ("Agora na TV", canais ao vivo): a página cairia na guarda
      // de feed, mas a transmissão é o HLS mestre que o player pediu. Em g1/ge só vale
      // com o vídeo live de verdade (duração infinita — pausado também conta).
      const globoPlay = /globoplay\./i.test(location.hostname);
      const liveVid = state.video.isConnected && state.video.duration === Infinity;
      const live = liveStream() || (/^https?:/i.test(direct) ? direct : "");
      if (live && (liveVid || globoPlay)) { primary = live; fallback = page; globoLive = true; }
      else if (globoPlay) {
        toast(/^pt/i.test(navigator.language) ? "Dê play na transmissão por alguns segundos e tente de novo — ainda não identifiquei o canal ao vivo." : "Press play on the broadcast for a few seconds and try again — I couldn't identify the live channel yet.", "err", 7000);
        return;
      }
    }
    if (primary === page && !igUrl) {
      const gen = !isYT() ? genericCardUrl(state.video) : "";         // feeds de outros sites: o link do card vence a página
      if (gen && gen !== page) { primary = gen; fallback = ""; }
      else {
        const alt = resolveBestPageOrVideoUrl(state.video);
        if (alt && alt !== page) fallback = alt;
      }
    }

    if (isTT() && !igUrl && !/^https?:/i.test(direct)) {
      toast(/^pt/i.test(navigator.language) ? "TikTok: não consegui identificar este vídeo. Abra o vídeo pelo título ou pelo botão Compartilhar e tente de novo." : "TikTok: could not identify this video. Open it using its title or Share button and try again.", "err", 7000);
      return;
    }
    if (isIG() && !igUrl && !/^https:\/\/www\.instagram\.com\/(p|reel|reels|tv|stories)\//.test(primary)) {
      toast(/^pt/i.test(navigator.language) ? "Instagram: não achei o link deste post. Clique na data do post (abre o post) e baixe de lá." : "Instagram: could not find this post's link. Click the post date to open it, then download from there.", "err", 7000);
      return;
    }
    if (isPin() && !igUrl) {                 // ainda procurando o stream (ele chega em instantes): tenta de novo antes de avisar
      await new Promise((x) => setTimeout(x, 1800));
      const again = state.video ? pinFeedUrl(state.video) : "";
      if (again) { return startOne(quality, sendTo, chooseAudio); }   // retry não pode perder o destino/áudio
      toast(/^pt/i.test(navigator.language) ? "Pinterest: não achei o link deste pin. Abra o pin (clique nele) e baixe de lá." : "Pinterest: could not find this pin's link. Open the pin (click it) and download from there.", "err", 7000);
      return;
    }
    if (isFB() && !igUrl && !fbCandidate(primary)) {
      toast(/^pt/i.test(navigator.language) ? "Facebook: não achei o link deste vídeo. Abra o vídeo (clique nele ou na data do post) e baixe de lá." : "Facebook: could not find this video's link. Open the video (click it or the post date) and download from there.", "err", 7000);
      return;
    }
    if (isX() && !igUrl && !X_STATUS_RE.test(new URL(primary, location.href).pathname)) {
      toast(/^pt/i.test(navigator.language) ? "X: não achei o link deste tweet. Clique na data do tweet (abre o tweet) e baixe de lá." : "X: could not find this tweet's link. Click the tweet date to open it, then download from there.", "err", 7000);
      return;
    }

    // Última guarda: feed/listagem de site conhecido não identifica UM vídeo — recusar em vez de baixar um vídeo qualquer.
    if (isGenericFeedUrl(primary)) {
      toast(t("feedNotVideo"), "err", 8000);
      return;
    }

    if (chooseAudio || quality === "audio") {
      await sendMsg({type:"OPEN_COLLECTION",seed:{media:"audio",items:[{url:primary,fallbackStream:fallback,referer:page,title:(cardInfo && cardInfo.title) || document.title,linkedinManifest:isLI()?liManifest(state.video):undefined}]}});
      return;
    }
    toast(t("starting"));

    const streamTitle = /\.(m3u8|mpd)(\?|#|$)/i.test(primary) ? await pageProgramTitle() : "";   // stream cru: o programa real, não o título da aba
    const res = await sendMsg({
      type: "DOWNLOAD",
      url: primary,
      fallbackStream: fallback,
      referer: (window !== window.top && /^https?:/i.test(document.referrer || "")) ? document.referrer : page,
      title: streamTitle || (igUrl && isIG() ? igTitle(state.video) : igUrl && isX() ? xTitle(state.video) : igUrl && isFB() ? fbTitle(state.video) : igUrl && isPin() ? pinTitle(igUrl, t("pinVideo")) : (cardInfo && cardInfo.title) || document.title),
      pageUrl: page,
      quality: quality || "best",
      target: sendTo || "",
      // live = sinal do MESMO alvo da URL: card clicado → selo/player daquele card; vídeo da página → selo do player.
      // pageIsLive() varre o documento: num feed com qualquer card AO VIVO, marcaria até download de VOD — não pode valer aqui.
      live: !!(globoLive || (state.video && state.video.isConnected && state.video.duration === Infinity) || (cardInfo && cardInfo.live)
               || (cardLive && /\.(m3u8|mpd)(\?|#|$)/i.test(primary))
               || (!cardInfo && !igUrl && primary === page && pageIsLive())),
      linkedinManifest: isLI() ? liManifest(state.video) : undefined
    });

    if (!res || !res.ok || !res.job_id) {
      toast(failText(res), "err", sendTo ? 9000 : 6500);
      return;
    }
    if (res.duplicate) toast(t("dupNote"), "ok");
    else if (sendTo) toast(t("sentProject", folderName(res.output_dir || "")), "ok", 6000);
    trackJob(res.job_id, res.output_dir || cfg.output_dir);
  }

  // texto de erro conforme a causa (servidor recusou a extensão x offline x outro erro)
  function failText(res) {
    if (res && res.error === "forbidden") return t("forbiddenMsg");
    if (res && res.error && res.error !== "Servidor local offline" && !res.timeout) return String(res.error).slice(0, 160);
    return t("serverOffline");
  }

  async function startAll() {
    const { items } = scan();
    const urls = items.map((i) => i.url).slice(0, 20);
    const playerPage = isYT() || /vimeo\.com|globoplay|globo\.com|dailymotion|twitch/.test(location.hostname);
    if (playerPage && !isGenericFeedUrl(location.href)) urls.unshift(location.href);
    else if (!urls.length) urls.push(location.href);

    const res = await sendMsg({
      type: "DOWNLOAD_MANY",
      urls,
      referer: location.href,
      quality: (state.cfg && state.cfg.default_quality) || "best",
      title: document.title
    });

    if (!res || !res.ok) {
      toast(t("queueFail"), "err");
      return;
    }
    const n = res.queued || 0;
    const failed = res.failed || 0;
    if (!n) { toast(failed ? t("queueFail") : t("nothingHere"), "err"); return; }
    ensurePoll();                                   // a pilula acompanha o lote como acompanha download único
    toast(t("queuedNote", n) + (failed ? " — " + t("queuedFail", failed) : ""), "ok", 5200);
  }

  /* ------------------------------------------------------ botão no YouTube -- */

  /* ------------------------------------------------------ botão no YouTube -- */
  const YT_BTN_ID = "noevfx-dl-wrap";

  // UM único listener global fecha o menu (antes, cada reinjeção do botão somava mais um)
  let ytCloserOn = false;
  function ensureYtCloser() {
    if (ytCloserOn) return;
    ytCloserOn = true;
    document.addEventListener("click", () => {
      document.querySelectorAll(".noevfx-dl-menu").forEach((m) => m.classList.add("noevfx-hidden"));
    });
  }

  function injectYouTubeButton() {
    if (!isYT() || location.pathname !== "/watch" || !ytId()) return;
    if (document.getElementById(YT_BTN_ID)) return;
    const bar =
      document.querySelector("#top-level-buttons-computed") ||
      document.querySelector("ytd-watch-metadata #actions #actions-inner") ||
      document.querySelector("#actions-inner");
    if (!bar) return;

    const wrap = document.createElement("div");
    wrap.id = YT_BTN_ID;
    wrap.className = "noevfx-dl-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "noevfx-dl-btn";
    btn.innerHTML = `${BRAND_SVG}<span>${t("ytDownload")}</span>`;

    const menu = document.createElement("div");
    menu.className = "noevfx-dl-menu noevfx-hidden";
    const dest = (state.cfg && state.cfg.output_dir) || "";
    menu.innerHTML = `
      <div class="noevfx-dl-dest" title="${esc(dest)}">📁 ${esc(dest ? folderName(dest) : t("folderLabel"))}</div>
      <button type="button" data-q="best">${t("ytBest")}</button>
      <button type="button" data-q="1080">${t("yt1080")}</button>
      <button type="button" data-q="720">${t("yt720")}</button>
      <button type="button" data-q="audio">${t("ytAudio")}</button>
    `;

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!e.isTrusted) return;
      await loadCfg();
      if (state.cfg && state.cfg.hover_action === "direct") {
        runYTDownload(btn, state.cfg.default_quality || "best");
        return;
      }
      menu.classList.toggle("noevfx-hidden");
    });

    ensureYtCloser();

    menu.querySelectorAll("button").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!e.isTrusted) return;
        menu.classList.add("noevfx-hidden");
        runYTDownload(btn, item.dataset.q);
      });
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    bar.appendChild(wrap);
  }

  async function runYTDownload(btn, quality) {
    const label = btn.querySelector("span");
    if (btn.disabled) return;
    label.textContent = t("ytStarting");
    btn.disabled = true;

    const res = await sendMsg({
      type: "DOWNLOAD",
      url: resolveBestPageOrVideoUrl(null),
      referer: location.href,
      title: document.title,
      pageUrl: location.href,
      quality: quality || "best",
      live: pageIsLive()
    });

    if (!res || !res.ok || !res.job_id) {
      label.textContent = res && res.error === "forbidden" ? t("forbiddenShort") : t("ytOffline");
      setTimeout(() => { label.textContent = t("ytDownload"); btn.disabled = false; }, 3200);
      return;
    }
    toast(res.duplicate ? t("dupNote") : t("downloadStarted"), "ok");
    trackJob(res.job_id, res.output_dir || "");           // pilula: o job entra na lista (com cancelar)
    // OBS: o temporizador NÃO pode se chamar "t" (escondia a função de tradução)
    let misses = 0;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (!btn.isConnected) { clearInterval(timer); return; }   // SPA trocou de página: para de perguntar pra sempre
      const reset = (ms) => setTimeout(() => { label.textContent = t("ytDownload"); btn.disabled = false; }, ms);
      try {
        const st = await sendMsg({ type: "STATUS", jobId: res.job_id });
        if (!st || !st.ok) {
          if (++misses >= 3) { clearInterval(timer); label.textContent = t("ytError"); reset(3000); }
          return;
        }
        misses = 0;
        const d = st.data || {};
        if (d.status === "downloading") label.textContent = d.progress ? t("downloadingP", d.progress) : t("downloading0");
        else if (d.status === "merging") label.textContent = t("ytMerging");
        else if (d.status === "done") {
          clearInterval(timer);
          label.textContent = t("ytSaved");
          reset(3000);
        } else if (d.status === "error" || d.status === "canceled") {
          clearInterval(timer);
          label.textContent = t("ytError");
          reset(3500);
        }
      } catch (_) {
        clearInterval(timer);
        btn.disabled = false;
        label.textContent = t("ytDownload");
      }
      if (Date.now() - started > 3 * 3600 * 1000) { clearInterval(timer); btn.disabled = false; }
    }, 900);
  }

  /* ------------------------------------------------------------------ boot -- */
  let scanTimer = null;
  function scheduleScan(delay) {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      if (document.visibilityState !== "visible") return;     // aba em segundo plano não varre
      publish(true);
      injectYouTubeButton();
    }, delay || 900);
  }

  const obs = new MutationObserver(() => scheduleScan(600));
  function startObserver() {
    try {
      obs.observe(document.documentElement || document, { childList: true, subtree: true });
    } catch (_) {}
  }

  // Sites de página única (TikTok, Instagram, YouTube...) trocam de vídeo sem recarregar a aba. Sem isto a lista
  // e a miniatura ficavam presas na PRIMEIRA página aberta.
  const baseUrl = () => location.href.split("#")[0];
  let lastHref = baseUrl();
  function onPageChange() {
    lastHref = baseUrl();
    state.video = null;
    state.cardEl = null;                         // SPA trocou de página: as âncoras antigas morreram junto
    state.sent.clear();
    state.thumb = "";
    netList.length = 0;
    netSet.clear();
    try { chrome.runtime.sendMessage({ type: "RESET_TAB" }, () => { void chrome.runtime.lastError; }); } catch (_) {}
    setTimeout(() => { publish(true); injectYouTubeButton(); }, 500);
  }

  const onReady = () => {
    startObserver();
    const navTimer = setInterval(() => {
      if (!chrome.runtime || !chrome.runtime.id) { clearInterval(navTimer); obs.disconnect(); staleNotice(); return; }
      if (baseUrl() !== lastHref) onPageChange();
    }, 300);
    loadPos();
    loadToastPos();
    sendMsg({ type: "JOBS" }).then((r) => {             // página recarregou com download ativo: retoma a pilula sozinha
      const js = r && r.data && Array.isArray(r.data.jobs) ? r.data.jobs : [];
      if (js.some((j) => ACTIVE_J.has(j.status) && !j.import_app && !j.batch)) ensurePoll();
      if (js.length) pollJobs();
    });
    loadCfg().then(() => {
      publish(true);
      injectYouTubeButton();
    });
    const pubTimer = setInterval(() => {
      // extensão recarregada/atualizada: este script ficou órfão, então para de trabalhar
      if (!chrome.runtime || !chrome.runtime.id) { clearInterval(pubTimer); obs.disconnect(); staleNotice(); return; }
      if (document.visibilityState === "visible") publish(false);
    }, 4000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  document.addEventListener("yt-navigate-finish", () => {
    if (baseUrl() !== lastHref) onPageChange();      // o vigia de URL cuida; aqui só garante a troca no YouTube
    else setTimeout(() => { publish(true); injectYouTubeButton(); }, 400);
  });

  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (!msg) return;
    if (msg.type === "IS_LIVE") {
      respond({ ok: true, live: pageIsLive() });
      return;
    }
    if (msg.type === "RESCAN") {
      const { items, thumb } = scan();
      state.thumb = thumb || state.thumb;
      items.forEach((it) => state.sent.set(it.url, sigOf(it)));
      publish(true);
      respond({ ok: true, items, thumb: state.thumb, title: document.title });
      return;
    }
    if (msg.type === "CONFIG_CHANGED") {
      loadCfg().then(() => {
        if (!fabOn()) { closePanel(); hideFab(); }
        respond({ ok: true });
      });
      return true;
    }
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.cfg) loadCfg();
    });
  } catch (_) {}
})();
