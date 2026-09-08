/* BLACK plan glyphs from Soft dimensions-assets (ef561e7).
 * Map: dimensions-assets/map/ASSET_MAP.md
 * Symbols: assets/dimensions/plan-symbols.svg (inlined below — no extra fetch).
 * Never Dimensions blue. Banquet pack maths stay out of this file.
 */
(function (root) {
  'use strict';

  const BLACK = '#111';
  const GOLD = '#c9a227';
  const DECK = '#f3eee6';
  const SOFT_PLACEHOLDERS = ['light', 'speaker', 'foldback', 'coffeecart', 'steps'];

  const ASSETS = {
    'banquet-chair': 'dimensions-assets/layouts/661a5fd5341b39d009244756_Dimensions-Layouts-Dining-Rooms-Rectangle-Formal-Medium-Icon.svg',
    'conference-chair': 'dimensions-assets/layouts/65a27969cae2314a8a2bd6be_Dimensions-Layouts-Meeting-Conference-Rooms-Circle-Medium-Icon.svg',
    'theatre-chair': 'dimensions-assets/layouts/65a27969cae2314a8a2bd6be_Dimensions-Layouts-Meeting-Conference-Rooms-Circle-Medium-Icon.svg',
    'round-table': 'dimensions-assets/layouts/65a27969cae2314a8a2bd6be_Dimensions-Layouts-Meeting-Conference-Rooms-Circle-Medium-Icon.svg',
    'classroom-table': 'dimensions-assets/chairs/658c4bec2f16f6d662835d29_Dimensions-Layouts-Classrooms-Shapes-Circle-Chairs-Icon.svg',
    'trestle-table': 'dimensions-assets/layouts/661a5fd5341b39d009244756_Dimensions-Layouts-Dining-Rooms-Rectangle-Formal-Medium-Icon.svg',
  };

  const SYMBOLS = '<symbol id="dim-banquet-chair" viewBox="345 262 60 52" overflow="visible"><path fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M351.563,279.913c0,.483.153.964.433,1.357.266.375.645.669,1.075.833.217.083.447.133.678.149.061.055,42.248-.028,42.345.005.078,0,.16-.004.237-.012.845-.079,1.615-.653,1.931-1.442.082-.199.136-.411.161-.626.003-.043.01-.09.011-.133,0-.042.005-.089.004-.131,0,0,0-15.069,0-15.069-.002-.032,0-.073-.002-.104-.019-.427-.157-.849-.396-1.203-.33-.495-.856-.853-1.437-.98-.141-.031-.286-.05-.43-.054-.172-.011-42.167.004-42.344,0-.258.009-.516.061-.758.153-.288.11-.555.278-.778.49-.232.22-.418.489-.543.783-.077.182-.132.376-.161.572-.011.079-.02.161-.023.241.001.033-.004.071-.002.104v15.069Z"/><polyline fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" points="398.407 280.288 400.989 309.375 349.011 309.375 351.593 280.288"/></symbol>'
    + '<symbol id="dim-conference-chair" viewBox="338 228 70 50" overflow="visible"><path fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M343.463,271.787c-0.001,0.473,0.143,0.945,0.408,1.337c0.251,0.375,0.611,0.676,1.024,0.856c0.427,0.191,0.813,0.213,1.274,0.203c0.184,0,0.369-0.021,0.547-0.063c0.875-0.199,1.586-0.91,1.785-1.785c0.042-0.179,0.063-0.364,0.063-0.547c-0.001-0.08,0.003-31.051-0.001-31.125c-0.005-0.147-0.024-0.296-0.056-0.44c-0.113-0.513-0.401-0.985-0.805-1.321c-0.277-0.231-0.608-0.399-0.959-0.485c-0.278-0.077-0.599-0.072-0.885-0.07c-0.371,0-0.742,0.087-1.073,0.254c-0.576,0.286-1.024,0.813-1.213,1.427c-0.059,0.188-0.095,0.385-0.105,0.581C343.445,240.657,343.474,271.705,343.463,271.787z"/><path fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M401.436,271.632c-0.003,0.724,0.321,1.441,0.867,1.916c0.539,0.478,1.286,0.707,2,0.614c0.81-0.096,1.554-0.608,1.934-1.331c0.118-0.221,0.203-0.461,0.252-0.706c0.023-0.115,0.038-0.234,0.044-0.351c0.014-0.259,0.001-30.72,0.001-30.992c-0.022-0.52-0.209-1.031-0.527-1.442c-0.335-0.437-0.817-0.76-1.349-0.904c-0.508-0.14-1.058-0.116-1.552,0.066c-0.603,0.22-1.115,0.676-1.4,1.251c-0.103,0.205-0.178,0.424-0.222,0.649c-0.026,0.134-0.042,0.272-0.047,0.409C401.418,240.808,401.448,271.605,401.436,271.632z"/><path fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M354.971,232.399c-1.173-0.001-2.349,0.302-3.368,0.885c-1.093,0.622-2.004,1.577-2.529,2.724c-0.23,0.5-0.387,1.036-0.461,1.582c-0.101,0.625-0.032,4.231-0.047,4.915c0.018,0.651,0.145,1.313,0.461,1.888c0.276,0.508,0.706,0.926,1.21,1.208c0.398,0.225,0.837,0.375,1.282,0.473c0.489,0.108,1,0.157,1.5,0.171c0.081-0.001,0.214,0.006,0.292,0.004c0,0,43.376,0,43.376,0c0.177-0.001,0.398-0.005,0.575-0.015c2.147-0.112,3.912-0.964,4.144-3.321c0.074-0.244,0.006-4.222,0.029-4.586c0-0.479-0.064-0.961-0.188-1.423c-0.478-1.821-1.906-3.309-3.64-4.001c-0.592-0.241-1.221-0.397-1.857-0.464c-0.142-0.014-0.294-0.026-0.437-0.032c-0.092-0.003-0.195-0.007-0.286-0.006C395.029,232.399,354.971,232.399,354.971,232.399z"/></symbol>'
    + '<symbol id="dim-round-table" viewBox="270 270 210 210" overflow="visible"><path fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" d="M471.429,375c0.035-32.894-16.92-63.762-44.699-81.379c-23.486-14.978-52.713-19.028-79.387-10.998c-27.376,8.154-49.955,28.357-61.09,54.662c-10.228,23.96-10.229,51.469,0,75.43c11.135,26.305,33.713,46.509,61.09,54.662c26.674,8.03,55.901,3.98,79.387-10.998C454.508,438.762,471.464,407.895,471.429,375z"/></symbol>'
    + '<symbol id="dim-classroom-table" viewBox="322 196 106 54" overflow="visible"><rect x="324.986" y="198.238" width="100.027" height="50.014" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>'
    + '<symbol id="dim-trestle-table" viewBox="241 307 268 136" overflow="visible"><rect x="243.75" y="309.375" width="262.5" height="131.25" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/></symbol>';

  function resolveChairKind(kind, style) {
    const s = String(style || '');
    if (s.indexOf('theatre') === 0) return 'theatre';
    if (kind === 'conference' || kind === 'theatre') return kind;
    return 'round';
  }

  function chairAssetId(kind) {
    if (kind === 'theatre' || kind === 'conference') return 'conference-chair';
    return 'banquet-chair';
  }

  function symbolId(assetId) {
    return 'dim-' + assetId;
  }

  function useAt(assetId, cx, cy, w, h, rot, sel) {
    const color = sel ? GOLD : BLACK;
    const href = '#' + symbolId(assetId);
    return `<g class="dim-furn" data-dim-asset="${assetId}" transform="rotate(${rot} ${cx} ${cy}) translate(${cx} ${cy})" style="color:${color};pointer-events:none">`
      + `<use href="${href}" xlink:href="${href}" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}"/>`
      + `</g>`;
  }

  function chairUse(kind, cx, cy, w, h, rot, sel) {
    return useAt(chairAssetId(kind), cx, cy, w, h, rot, sel);
  }

  function roundTable(x, y, r, selected) {
    const color = selected ? GOLD : BLACK;
    const href = '#dim-round-table';
    const d = r * 2;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${DECK}" stroke="none" style="pointer-events:none"/>`
      + `<g class="dim-furn" data-dim-asset="round-table" transform="translate(${x} ${y})" style="color:${color};pointer-events:none">`
      + `<use href="${href}" xlink:href="${href}" x="${-r}" y="${-r}" width="${d}" height="${d}"/>`
      + `</g>`;
  }

  function rectTable(x, y, w, d, selected, assetId) {
    const id = assetId || (d < w * 0.4 ? 'classroom-table' : 'trestle-table');
    const color = selected ? GOLD : BLACK;
    const href = '#' + symbolId(id);
    return `<rect x="${x - w / 2}" y="${y - d / 2}" width="${w}" height="${d}" rx="${Math.min(4, d * 0.12)}" fill="${DECK}" stroke="none" style="pointer-events:none"/>`
      + `<g class="dim-furn" data-dim-asset="${id}" transform="translate(${x} ${y})" style="color:${color};pointer-events:none">`
      + `<use href="${href}" xlink:href="${href}" x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}"/>`
      + `</g>`;
  }

  function isSoftPlaceholder(type) {
    return SOFT_PLACEHOLDERS.indexOf(type) >= 0;
  }

  function mountDefs(svg) {
    if (!svg) return;
    let defs = svg.querySelector('#dimDefs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('id', 'dimDefs');
      svg.insertBefore(defs, svg.firstChild);
    }
    if (!defs.querySelector('#dim-banquet-chair')) defs.innerHTML = SYMBOLS;
  }

  const api = {
    BLACK, GOLD, DECK, ASSETS, SOFT_PLACEHOLDERS, SYMBOLS,
    resolveChairKind, chairAssetId, chairUse, useAt,
    roundTable, rectTable, isSoftPlaceholder, mountDefs,
  };
  root.Plan2dDim = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : global);
