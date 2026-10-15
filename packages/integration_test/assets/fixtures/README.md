# Offline legacy tab metadata

The integration suite retains several public URLs to exercise redirects, URL
sorting, duplicate matching, and existing visual baselines. `util.ts` serves
fixed HTML and bundled icons for these sites. This also keeps test-suite video
recordings independent of their network availability.

The three additional frozen icons were retrieved on 2026-10-15 from:

- `xcv58.png`: https://xcv58.com/favicon.png
- `nextjs.ico`: https://nextjs.org/favicon.ico
- `ops-class.png`: https://ops-class.org/img/favicon/favicon-32x32.png

Their titles match the existing Linux baselines. Pinboard and DuckDuckGo already
have frozen fixtures in this directory. These legacy test fixtures are distinct
from the fictional websites used in marketing captures under `../capture-sites`.
