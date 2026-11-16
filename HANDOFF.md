# Handoff — Noe VFX Downloader 3.2.2

## Estado consolidado
A revisão de 16/11/2026 consolidou as pílulas azuis por download, pilha aberta por clique e confirmação local no card. O usuário testou o fluxo de uso real e informou funcionamento. Integração Adobe já funcionava; não houve novo teste dentro dos aplicativos nesta rodada.

## Interface
- Cards com 460 × 64 CSS px quando há espaço, 12 px entre cards. Em janela estreita a largura acompanha a tela.
- Duas colunas de ações reservadas: Parar e salvar alinhado entre lives, seta branca na coluna final.
- Seta para cima abre; para baixo recolhe. Textos de aviso centralizados.
- Aviso de recarga usa largura/altura próprias, quebra de linha e reposicionamento após medir. Aparece apenas no documento principal.
- FAB do feed nasce à esquerda, evita o áudio do YouTube e guarda arrasto em fabCardPos separado de fabPos.
- Cards concluídos são mantidos brevemente em finishingJobs. Temporizadores verificam a identidade do card para não operar sobre estado já descartado.
- Cancelamento desaparecido do servidor encerra tracking/callback uma vez, sem jobsLost tardio.

## Capacidade e comunicação
MAX_CONCURRENT = 3 é global e compartilhado por lives e arquivos. Não são três vagas adicionais por tipo. O feed do YouTube pode identificar o link antes de reproduzir; outros sites podem exigir play.
Capturas reproduzíveis com dados demonstrativos: tools/capturar-pilhas.py. Site/manual: docs/site e docs/MANUAL-DE-USO.md.

## Validação
node --check browser/content.js
node tests/feed_guard.js
python -m unittest discover -s tests

Preservar formato e alinhamento aprovados. Publicação autorizada pelo usuário nesta sessão; a autorização cobre a 3.2.2 e as páginas documentais. Photoshop vem depois do GitHub.
