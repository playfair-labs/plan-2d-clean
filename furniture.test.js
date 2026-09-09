'use strict';
/** t661: BLACK Dimensions furniture on svg#plan. Banquet pack maths frozen. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const t657 = fs.readFileSync(path.join(__dirname, 't657.html'), 'utf8');
const map = fs.readFileSync(path.join(__dirname, 'dimensions-assets/map/ASSET_MAP.md'), 'utf8');
const dimJs = fs.readFileSync(path.join(__dirname, 'assets/dimensions/dimensions-icons.js'), 'utf8');

function sliceFn(src, name) {
  const m = src.match(new RegExp('function ' + name + '\\('));
  assert.ok(m, name + ' present');
  const start = src.indexOf('{', m.index);
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return src.slice(m.index, j + 1);
    }
  }
  throw new Error('unclosed ' + name);
}

assert.strictEqual(sliceFn(html, 'packHexSync'), sliceFn(t657, 'packHexSync'), 'packHexSync frozen vs t657');
assert.strictEqual(sliceFn(html, 'packSolidsFromItems'), sliceFn(t657, 'packSolidsFromItems'), 'packSolidsFromItems frozen vs t657');
assert.strictEqual(
  html.match(/const BEST_SEED = \[[^\]]+\]/)[0],
  t657.match(/const BEST_SEED = \[[^\]]+\]/)[0],
  'BEST_SEED frozen',
);
assert.strictEqual(
  html.match(/const MIN_C2C = [^;]+/)[0],
  t657.match(/const MIN_C2C = [^;]+/)[0],
  'MIN_C2C frozen',
);

assert.ok(html.indexOf('dimensions-icons.js?t661') >= 0, 'index loads dimensions-icons');
assert.ok(/function chairIconMarkup\(/.test(html), 'chairIconMarkup');
assert.ok(/Plan2dDim\.chairUse/.test(html), 'chairs use Plan2dDim glyphs');
assert.ok(/Plan2dDim\.roundTable/.test(html), 'rounds use Dimensions table');
assert.ok(/Plan2dDim\.rectTable/.test(html), 'trestles use Dimensions table');
assert.ok(/data-seat="\$\{i\}"/.test(html), 'nested chair hit kept');
assert.ok(/id="dimDefs"/.test(html), 'svg#plan holds symbol defs');

assert.ok(!/#2b6cb0|#4a90d9|#0070f3|#1e90ff|#3b82f6|#1[Bb]7[Ff]{2}|#3[Aa]54[Ff]5/.test(html + dimJs), 'wired icons not Dimensions blue');
assert.ok(dimJs.indexOf("const BLACK = '#111'") >= 0, 'icons black #111');
assert.ok(dimJs.indexOf('SOFT_PLACEHOLDERS') >= 0, 'Soft kit list');
assert.ok(dimJs.indexOf('currentColor') >= 0, 'symbols recolor via currentColor');

['light', 'speaker', 'foldback', 'coffeecart', 'steps'].forEach((t) => {
  assert.ok(dimJs.indexOf("'" + t + "'") >= 0, t + ' stays Soft placeholder');
});
assert.ok(/it\.type==='light' \? '#9a958c' : '#8e8880'/.test(html), 'kit else-branch Soft gray still drawn');

assert.ok(map.indexOf('Wired (t661)') >= 0);
assert.ok(map.indexOf('Dining-Rooms-Rectangle-Formal') >= 0);
assert.ok(map.indexOf('NOT found as Dimensions Icon') >= 0);

const Dim = require('./assets/dimensions/dimensions-icons.js');
assert.strictEqual(Dim.resolveChairKind('round', 'banquet'), 'round');
assert.strictEqual(Dim.resolveChairKind('round', 'cabaret-max'), 'round');
assert.strictEqual(Dim.resolveChairKind('conference', 'classroom-max'), 'conference');
assert.strictEqual(Dim.resolveChairKind('conference', 'theatre-max'), 'theatre');
assert.strictEqual(Dim.resolveChairKind('conference', 'u-shape'), 'conference');
assert.ok(Dim.chairUse('round', 10, 10, 16, 20, 0, false).indexOf('dim-banquet-chair') >= 0);
assert.ok(Dim.chairUse('conference', 10, 10, 16, 20, 0, false).indexOf('dim-conference-chair') >= 0);
assert.ok(Dim.roundTable(0, 0, 20, false).indexOf('round-table') >= 0);
assert.ok(Dim.rectTable(0, 0, 80, 22, false).indexOf('classroom-table') >= 0);
assert.ok(Dim.rectTable(0, 0, 80, 40, false).indexOf('trestle-table') >= 0);
assert.ok(Dim.isSoftPlaceholder('speaker'));
assert.ok(Dim.isSoftPlaceholder('steps'));
assert.ok(!Dim.isSoftPlaceholder('round'));
assert.ok(Dim.SYMBOLS.indexOf('id="dim-banquet-chair"') >= 0);
assert.ok(Dim.SYMBOLS.indexOf('#1B7FFF') < 0 && Dim.SYMBOLS.indexOf('#3A54F5') < 0);

assert.ok(html.indexOf('t661') >= 0, 'stamp t661');
assert.strictEqual(fs.readFileSync(path.join(__dirname, 'LATEST.txt'), 'utf8').trim(), 't661');

console.log('furniture.test.js ok');
