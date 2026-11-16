// Somente leitura da fonte do player Video.js. Sem cookies, rede ou mudança no site.
(() => {
  "use strict";
  const last = new WeakMap();
  function emit(video, data) {
    const text = JSON.stringify({videoSrc:video.currentSrc,...data});
    if (text.length > 1200000 || last.get(video) === text) return;
    last.set(video,text);
    video.dispatchEvent(new CustomEvent('noevfx-linkedin-source',{bubbles:true,detail:text}));
  }
  function publish() {
    document.querySelectorAll('video').forEach(video => {
      try {
        const player = video.closest('[data-vjs-player]');
        const source = player && player.player && player.player.currentSource();
        if (!source || typeof source.src !== 'string') { if(last.has(video))emit(video,{}); return; }
        // DASH/HLS também chegam por HTTP sem extensão .mpd/.m3u8 no endereço.
        if (/^https:\/\/dms\.licdn\.com\/playlist\/vid\//i.test(source.src)) {
          if (/dash|mpegurl|video\/mp4/i.test(source.type || '') || /\/mp4-[^/]+\//i.test(source.src)) emit(video,{sourceUrl:source.src});
          else if(last.has(video))emit(video,{});
          return;
        }
        if (!source.src.startsWith('data:application/vnd.videojs.vhs+json,')) { if(last.has(video))emit(video,{}); return; }
        const data = JSON.parse(source.src.slice(source.src.indexOf(',') + 1));
        if (!data.endList || !Array.isArray(data.playlists)) { if(last.has(video))emit(video,{}); return; }
        const playlists = data.playlists.slice(0,24).filter(p => p.endList && Array.isArray(p.segments) && p.segments.length && p.segments.length <= 4000 && !p.segments.some(s => s.key || s.byterange || s.map?.byterange));
        const clean = playlists.map(p => ({attributes:p.attributes,segments:p.segments.map(s => ({uri:s.resolvedUri||s.uri,duration:s.duration,map:s.map?{uri:s.map.resolvedUri||s.map.uri}:undefined}))}));
        emit(video,{playlists:clean});
      } catch (_) { if(last.has(video))emit(video,{}); }
    });
  }
  setInterval(publish,1500);
  document.addEventListener('play',publish,true);
  publish();
})();
