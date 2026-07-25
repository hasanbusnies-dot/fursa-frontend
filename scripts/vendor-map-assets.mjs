/**
 * Copies the map runtime files we serve ourselves out of node_modules into
 * public/vendor/, and fails loudly if they've drifted.
 *
 * Why any of this is vendored:
 *  · maplibre-gl-worker.mjs — Turbopack rewrites `import.meta.url` to a
 *    `file://` string, which trips maplibre's own guard
 *    (`if (!/^https?:/.test(import.meta.url)) return ''`) and leaves it with an
 *    EMPTY worker URL. `new Worker('', {type:'module'})` then resolves to the
 *    current document, the browser gets HTML, and map init dies with
 *    "Failed to load module script ... non-JavaScript MIME type of 'text/html'".
 *    Serving the worker ourselves and passing it to `setWorkerUrl()` sidesteps
 *    the bundler entirely.
 *  · maplibre-gl-shared.mjs — the worker's only import (`./maplibre-gl-shared.mjs`),
 *    so it MUST sit next to the worker under the exact same filename.
 *  · mapbox-gl-rtl-text.js — Arabic glyph shaping, kept off unpkg so no
 *    third-party origin is in the runtime path.
 *
 * These are byte copies of the installed version: bumping maplibre-gl without
 * re-running this would pair a new library with an old worker. `predev` and
 * `prebuild` run it so that can't happen silently.
 */

import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const COPIES = [
  ['node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', 'public/vendor/maplibre/maplibre-gl-worker.mjs'],
  ['node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs', 'public/vendor/maplibre/maplibre-gl-shared.mjs'],
  ['node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js', 'public/vendor/mapbox-gl-rtl-text.js'],
  ['node_modules/@mapbox/mapbox-gl-rtl-text/LICENSE.md', 'public/vendor/mapbox-gl-rtl-text.LICENSE.md'],
];

let copied = 0;
for (const [from, to] of COPIES) {
  const src = join(root, from);
  if (!existsSync(src)) {
    console.error(`[vendor-map-assets] MISSING ${from} — run npm install first.`);
    process.exit(1);
  }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(src, join(root, to));
  copied++;
}

const v = read('node_modules/maplibre-gl/package.json').version;
console.log(`[vendor-map-assets] ${copied} files vendored (maplibre-gl ${v}).`);
