'use strict';
const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(/id="pdfStack"/.test(html), 'PDF stack in map dock');
assert.ok(/id="pdfPreviewBtn"/.test(html), 'PDF preview');
assert.ok(/id="pdfCurrentBtn"/.test(html), 'PDF current plan');
assert.ok(/id="pdfEventBtn"/.test(html), 'PDF entire event');
assert.ok(/id="phoneAppBtn"/.test(html), 'phone app');
assert.ok(/id="pdfPreview"/.test(html) && /Escape or X/.test(html), 'preview overlay + Escape/X');
assert.ok(/id="projectorBtn"/.test(html) && /id="throwBtn"/.test(html), 'projectors + throw toggles');
assert.ok(/Banquet · Standard max/.test(html), 'Banquet Standard max');
assert.ok(/Cabaret · Standard max/.test(html), 'Cabaret Standard max');
assert.ok(/Classroom · Standard max/.test(html), 'Classroom Standard max');
assert.ok(/Theatre · Standard max/.test(html), 'Theatre Standard max');
assert.ok(html.indexOf('assets/myles-av-logo.svg') >= 0, 'Myles AV logo left');
assert.ok(html.indexOf('assets/qt-parramatta-logo.svg') >= 0, 'Parramatta logo right');
assert.ok(/window\.__planDemos/.test(html), 'venue demos A/B/C');
assert.ok(/id="buildStampBig"/.test(html), 'build stamp stays');
const stackAt = html.indexOf('id="pdfStack"');
const stampAt = html.indexOf('id="buildStampBig"');
assert.ok(stackAt > 0 && stampAt > stackAt, 'PDF stack is ABOVE the build stamp');

console.log('output.test.js ok');
