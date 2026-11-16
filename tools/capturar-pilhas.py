"""Capturas de documentação da interface real com respostas demonstrativas, sem downloads."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs/site/assets"

def main():
    source = (ROOT / "browser/content.js").read_text(encoding="utf-8")
    source = source.replace("  const onReady = () => {", "  window.preview={state,renderJobs,renderPanel,openPanel,ensureHost};const onReady = () => {")
    scenes = {
        "tres-lives": [True, True, True],
        "fila-cinco": [False, False, False, "queued", "queued"],
        "fila-mista": [True, True, False, "queued"],
    }
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge")
        for name, kinds in scenes.items():
            page = browser.new_page(viewport={"width": 760, "height": 600}, device_scale_factor=2)
            page.set_content('<html lang="pt-BR"><body style="margin:0;background:#10131b"></body></html>')
            page.evaluate("""() => {
                chrome.runtime={id:'preview',onMessage:{addListener(){}},sendMessage:(m,cb)=>cb?.({ok:true,data:{jobs:[]}})};
                chrome.storage={local:{get:(k,cb)=>cb({})},onChanged:{addListener(){}}};
                globalThis.NVF_EDITION='editors';
                Object.defineProperty(navigator,'language',{value:'pt-BR'});
            }""")
            page.add_script_tag(content=(ROOT / "browser/i18n.js").read_text(encoding="utf-8"))
            page.add_script_tag(content=source)
            jobs = []
            for i, kind in enumerate(kinds):
                jobs.append({"id": i+1, "created": 10-i, "title": ("Transmissão ao vivo " if kind is True else "Vídeo de referência ")+str(i+1),
                             "status": "queued" if kind == "queued" else "downloading", "live": kind is True,
                             "progress": "" if kind == "queued" else "42%", "started": 0})
            page.evaluate("""jobs => { for(const job of jobs) job.started=Date.now()/1000-83;
                preview.state.jobs=jobs;preview.state.jobsOpen=true;preview.renderJobs(); }""", jobs)
            page.wait_for_timeout(500)
            assert page.evaluate("preview.state.root.querySelectorAll('.j-row').length") == len(jobs)
            page.screenshot(path=str(OUT / (name+"-3.2.2.png")), clip={"x":130,"y":600-26-(len(jobs)*76-12)-24,"width":500,"height":len(jobs)*76-12+48})
            page.close()
        browser.close()

if __name__ == "__main__":
    main()
