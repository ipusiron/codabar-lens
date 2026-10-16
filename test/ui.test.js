'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('index.html');
const app = read('app.js');
const messages = require('../messages.js');

test('Extracted UI loads only the Codabar reader and local classic scripts', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m => m[1]);
  assert.deepEqual(scripts, ['nw7-core.js', 'lesson-core.js', 'messages.js', 'app.js']);
  assert.doesNotMatch(app, /PostMirrorCore|PostMirrorImage|decodeBars|addressNumber|postalCode/);
  assert.doesNotMatch(html, /type="module"|id="(?:barcode-mode|postal-result|address-result|photo-transfer)"/);
});

test('All five learning tabs have unique accessible tab and panel pairs', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const name of ['decode', 'lab', 'photo', 'learn', 'quiz']) {
    assert.match(html, new RegExp(`id="tab-${name}"[^>]+role="tab"[^>]+aria-controls="panel-${name}"`));
    assert.match(html, new RegExp(`id="panel-${name}"[^>]+role="tabpanel"[^>]+aria-labelledby="tab-${name}"`));
  }
  assert.match(app, /ArrowLeft.*ArrowRight.*Home.*End/);
});

test('Messages have matching language keys, substitutions and complete static labels', () => {
  assert.deepEqual(Object.keys(messages.ja).sort(), Object.keys(messages.en).sort());
  for (const key of Object.keys(messages.ja)) {
    const params = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(params(messages.ja[key]), params(messages.en[key]), key);
  }
  for (const [, key] of html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)) assert.ok(messages.ja[key], key);
});

test('No image or decoded data persistence, networking, unsafe HTML or inline handlers', () => {
  assert.doesNotMatch(app, /sessionStorage|indexedDB|document\.cookie|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|toDataURL|toBlob/);
  assert.doesNotMatch(html + app, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|\son\w+\s*=/);
  const calls = [...app.matchAll(/localStorage\.(?:getItem|setItem)\('([^']+)'/g)];
  assert.equal(calls.length, 2);
  for (const [, key] of calls) assert.equal(key, 'codabar-lens.lang');
  assert.equal([...app.matchAll(/localStorage/g)].length, calls.length);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /base-uri 'none'/);
});

test('File types, size bound and asynchronous disposal from PostMirror are retained', () => {
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.doesNotMatch(html, /\s(?:capture|multiple)(?:\s|=|>)/);
  assert.match(app, /const limit = 16777216/);
  assert.match(app, /if \(version !== photo.version\) return/);
  assert.match(app, /if \(bitmap\) bitmap.close\(\)/);
  assert.match(app, /if \(state.tab === 'photo' && name !== 'photo'\) releasePhoto\(\)/);
});

test('External links are explicit and isolate the destination tab', () => {
  const expected = new Set(['https://ipusiron.github.io/postmirror/', 'https://github.com/ipusiron/codabar-lens',
    'https://barcodeguide.seagullscientific.com/Content/Symbologies/Codabar.htm', 'https://docs.strich.io/codabar.html']);
  for (const [, attributes] of html.matchAll(/<a\b([^>]+)>/g)) {
    assert.ok(expected.delete(/href="([^"]+)"/.exec(attributes)[1]));
    assert.match(attributes, /target="_blank"/);
    assert.match(attributes, /rel="noopener noreferrer"/);
  }
  assert.equal(expected.size, 0);
});

test('Every static application message key is present in both languages', () => {
  const pattern = /['"]((?:photo|nw7|lab|page|language|sample|experiment|quiz)\.[\w.]+)['"]/g;
  for (const [, key] of app.matchAll(pattern)) {
    if (key.endsWith('.')) continue;
    for (const lang of ['ja', 'en']) assert.ok(messages[lang][key], key);
  }
});

test('Every dynamic sample, experiment and quiz label is translated and answerable', () => {
  const lesson = require('../lesson-core.js');
  for (const language of ['ja', 'en']) {
    const m = messages[language];
    for (const sample of lesson.samples) assert.ok(m['sample.' + sample.id]);
    for (const effect of lesson.effects) {
      assert.ok(m['experiment.effect.' + effect]); assert.ok(m['experiment.note.' + effect]);
    }
    for (const q of lesson.questions) {
      assert.ok(m['quiz.' + q.id + '.question']); assert.ok(m['quiz.' + q.id + '.explanation']);
      const choices = [0, 1, 2].map(n => m['quiz.' + q.id + '.choice.' + n]);
      assert.equal(new Set(choices).size, 3); assert.ok(choices.every(Boolean));
      assert.ok(choices[q.correct]);
    }
  }
});
