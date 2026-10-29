'use strict';

// The README use cases quote numbers; recompute each one with lesson-core.js and nw7-core.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lesson = require('../lesson-core.js');
const reader = require('../nw7-core.js');
const messages = require('../messages.js');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const readme = { ja: read('README.md'), en: read('README.en.md') };
const sections = { ja: '## 🎯 ユースケース', en: '## 🎯 Use cases' };
const labels = {
  ja: ['このツールならではの使い方', '一般的な使い方'],
  en: ['Ways of using this tool in particular', 'General uses']
};
const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

function useCases(language) {
  const text = readme[language], heading = sections[language];
  const start = text.indexOf(heading + '\n');
  assert.ok(start >= 0, heading);
  const end = text.indexOf('\n## ', start + heading.length);
  const lines = text.slice(start + heading.length, end).trim().split('\n');
  const [own, general] = labels[language];
  const split = lines.indexOf(general);
  assert.equal(lines[0], own, language);
  assert.ok(split > 1, language);
  const bullets = part => part.filter(line => line.startsWith('- '));
  return { own: bullets(lines.slice(1, split)), general: bullets(lines.slice(split + 1)) };
}
// Parse inside each test so that a broken section fails as a test, not while loading the file.
const ownUses = () => ({ ja: useCases('ja').own.join('\n'), en: useCases('en').own.join('\n') });

test('README: both languages open the use cases with three tool-specific uses', () => {
  const uses = { ja: useCases('ja'), en: useCases('en') }, own = ownUses();
  assert.equal(uses.ja.own.length, 3);
  assert.equal(uses.en.own.length, uses.ja.own.length);
  assert.equal(uses.en.general.length, uses.ja.general.length);
  assert.ok(uses.ja.general.length >= 4);
  for (const line of uses.ja.own) assert.match(line, /^- [^：]+（[^）]+）：/);
  for (const line of uses.en.own) assert.match(line, /^- [^:]+ \([^)]+\): /);
  for (const word of ['分かる', '分から', '分かり', '無い', '効く', '効い', '照合', '突き合わ', '向き', '**']) {
    assert.ok(!own.ja.includes(word), word);
  }
  assert.doesNotMatch(own.en, /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
});

test('README: reversed widths pair up the 16 content characters, and only A-D have no partner', () => {
  const own = ownUses();
  // Widths of every symbol come from lesson.describe, the table the samples are drawn with.
  const characters = [...lesson.describe('A0123456789-$:/.+B').characters, ...lesson.describe('C00D').characters];
  const widthOf = new Map(characters.map(c => [c.symbol, c.widths.join('')]));
  assert.equal(widthOf.size, 20);
  const symbolOf = new Map([...widthOf].map(([symbol, widths]) => [widths, symbol]));
  const reversed = symbol => symbolOf.get([...widthOf.get(symbol)].reverse().join('')) ?? null;
  const content = [...'0123456789-$:/.+'];
  for (const symbol of content) {
    assert.notEqual(reversed(symbol), null, symbol);
    assert.notEqual(reversed(symbol), symbol, symbol);
    assert.equal(reversed(reversed(symbol)), symbol, symbol);
  }
  assert.deepEqual([...'ABCD'].map(reversed), [null, null, null, null]);
  const pairs = content.filter(s => content.indexOf(s) < content.indexOf(reversed(s))).map(s => [s, reversed(s)]);
  assert.equal(pairs.length, 8);
  const backwards = [...'123456'].reverse().map(reversed).join('');
  assert.equal(backwards, '567098');

  // The content runs of A567098A are the content runs of A123456A in reverse order.
  const forward = lesson.describe('A123456A'), other = lesson.describe('A' + backwards + 'A');
  assert.deepEqual(other.runs.slice(8, -8), forward.runs.slice(8, -8).reverse());
  // Turning the label upside down reverses the bars, and the reader still reads 123456.
  const { image, region } = lesson.render('A123456A');
  const { width, height } = image;
  const turned = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4, to = ((height - 1 - y) * width + width - 1 - x) * 4;
      turned.set(image.data.subarray(from, from + 4), to);
    }
  }
  const row = (data, y) => [...Array(width).keys()].map(x => data[(y * width + x) * 4]);
  assert.deepEqual(row(turned, height - 1 - region.start.y), row(image.data, region.start.y).reverse());
  const turn = point => ({ x: width - 1 - point.x, y: height - 1 - point.y });
  assert.equal(reader.read({ width, height, data: turned }, { start: turn(region.end), end: turn(region.start) }).text, '123456');

  const mark = s => /\d/.test(s) ? s : '`' + s + '`';
  const ja = pairs.map(([a, b]) => `${mark(a)}と${mark(b)}`).join('、') + `の${pairs.length}組`;
  const enList = pairs.map(([a, b]) => `${mark(a)} and ${mark(b)}`);
  const en = `The ${words[pairs.length]} pairs are ${enList.slice(0, -1).join(', ')}, and ${enList.at(-1)}.`;
  assert.ok(own.ja.includes(ja), ja);
  assert.ok(own.en.includes(en), en);
  assert.ok(own.ja.includes(`内容に使う${content.length}文字`));
  assert.ok(own.en.includes(`Each of the ${content.length} content characters`));
  assert.ok(own.ja.includes(`\`123456\`を逆から読むと\`${backwards}\`になり、これも内容として使える並びである`));
  assert.ok(own.en.includes(`\`123456\` read backwards becomes \`${backwards}\`, which is also a valid content string`));
  assert.ok(own.ja.includes('開始・終了記号のA〜Dの4文字だけ'));
  assert.ok(own.en.includes('Only the four start/stop characters A–D'));
  assert.ok(own.ja.includes('ラベルを上下逆さにすると、バーの並びは逆順になる'));
  assert.ok(own.en.includes('turning a label upside down reverses the order of its bars'));
  const symbols = lesson.samples[2].raw;
  assert.ok(own.ja.includes(`「${messages.ja['tab.decode']}」の「${messages.ja['sample.symbols']}」（\`${symbols}\`）`));
  assert.ok(own.en.includes(`In ${messages.en['tab.decode']}, look at the widths of each character `
    + `in “${messages.en['sample.symbols']}” (\`${symbols}\`)`));
});

test('README: seven scanlines need three matching readings and no conflict; the thin line leaves exactly three', () => {
  const own = ownUses(), raw = 'A123456A';
  assert.equal(lesson.samples[0].raw, raw);
  const clean = lesson.render(raw), striped = lesson.render(raw, 'stripe');
  const { width, height } = clean.image;
  const dark = (image, x, y) => image.data[(y * width + x) * 4] < 128;
  const columns = [...Array(width).keys()].filter(x => dark(clean.image, x, clean.region.start.y));
  const left = columns[0], right = columns.at(-1) + 1;
  const barRows = [...Array(height).keys()].filter(y => dark(clean.image, left, y));
  const paint = (image, rows) => {
    const data = image.data.slice();
    for (const y of rows) {
      for (let x = left; x < right; x++) {
        const k = (y * width + x) * 4;
        data[k] = data[k + 1] = data[k + 2] = 0;
      }
    }
    return { width, height, data };
  };
  const status = image => reader.read(image, clean.region).status;
  const keepOnly = kept => paint(clean.image, barRows.filter(y => !kept.includes(y)));

  // A row belongs to a scanline when it reads together with its two neighbours and nothing else.
  const found = new Set();
  for (let i = 0; i + 3 <= barRows.length; i++) {
    const kept = barRows.slice(i, i + 3);
    if (status(keepOnly(kept)) === 'read') kept.forEach(y => found.add(y));
  }
  const lines = [...found].sort((a, b) => a - b);
  assert.equal(lines.length, 7);
  // The quorum is the smallest number of kept scanlines that always reads; one fewer never reads.
  const subsets = (list, size) => size === 0 ? [[]] : list.flatMap((item, i) =>
    subsets(list.slice(i + 1), size - 1).map(rest => [item, ...rest]));
  const reads = size => subsets(lines, size).map(kept => status(keepOnly(kept)) === 'read');
  const quorum = lines.map((_, i) => i + 1).find(size => reads(size).every(Boolean));
  assert.equal(quorum, 3);
  assert.ok(reads(quorum - 1).every(read => !read));

  // Six agreeing lines and one abstaining line read; six agreeing lines and one conflicting line do not.
  const conflicting = lesson.render('A123457A');
  assert.deepEqual(conflicting.region, clean.region);
  assert.equal(reader.read(conflicting.image, conflicting.region).text, '123457');
  for (const y of lines) {
    assert.equal(status(paint(clean.image, [y])), 'read');
    const data = clean.image.data.slice();
    data.set(conflicting.image.data.subarray(y * width * 4, (y + 1) * width * 4), y * width * 4);
    assert.equal(status({ width, height, data }), 'unreadable', String(y));
  }

  // The thin black line of Image lab covers four scanlines; the other three still read.
  assert.equal(striped.image.width, width);
  const stripeRows = barRows.filter(y => striped.image.data.subarray(y * width * 4, (y + 1) * width * 4)
    .some((value, i) => value !== clean.image.data[y * width * 4 + i]));
  const blocked = lines.filter(y => stripeRows.includes(y)), remaining = lines.filter(y => !stripeRows.includes(y));
  assert.equal(blocked.length, 4);
  assert.equal(remaining.length, quorum);
  assert.equal(reader.read(striped.image, striped.region).text, '123456');
  for (const y of remaining) assert.equal(status(paint(striped.image, [y])), 'unreadable', String(y));

  const n = lines.length, ja = messages.ja, en = messages.en;
  for (const phrase of [
    `平行な線（走査線）を${n}本引き、${quorum}本以上が同じ文字列を読み`,
    `読めない線は${n - quorum}本まで許す`,
    `${n}本のうち${n - 1}本が同じ文字列を読んでも、残る1本が別の文字列なら結果を出さない`,
    `「${ja['tab.lab']}」で「${ja['sample.digits']}」（\`${raw}\`）に加工「${ja['experiment.effect.stripe']}」を選ぶ`,
    `${n}本のうち${blocked.length}本がふさがれ、残る${remaining.length}本でちょうど条件を満たして読める`
  ]) assert.ok(own.ja.includes(phrase), phrase);
  for (const phrase of [
    `draws ${words[n]} parallel lines (scanlines)`,
    `at least ${words[quorum]} of them read the same string`,
    `tolerates up to ${words[n - quorum]} unreadable lines`,
    `even if ${words[n - 1]} of the ${words[n]} read the same string`,
    `In ${en['tab.lab']}, choosing “${en['sample.digits']}” (\`${raw}\`) with the treatment “${en['experiment.effect.stripe']}”`,
    `blocks ${words[blocked.length]} of the ${words[n]} lines, and the remaining ${words[remaining.length]} just meet the condition`
  ]) assert.ok(own.en.includes(phrase), phrase);
});

test('README: at the sample scale, wider or uneven separators read 123456 wherever the end bars are tapped, '
  + 'and a fivefold separator is rejected', () => {
  const own = ownUses(), raw = 'A123456A', reference = lesson.render(raw);
  // Measure the narrow and wide widths of the sample image along the row it is read on.
  const { width: sampleWidth } = reference.image, row = reference.region.start.y;
  const dark = x => reference.image.data[(row * sampleWidth + x) * 4] < 128;
  const columns = [...Array(sampleWidth).keys()].filter(dark);
  const left = columns[0], right = columns.at(-1) + 1;
  const elements = [];
  for (let begin = left, x = left + 1; x <= right; x++) {
    if (x === right || dark(x) !== dark(begin)) { elements.push(x - begin); begin = x; }
  }
  const [narrow, wide] = [...new Set(elements)].sort((a, b) => a - b);
  assert.equal(new Set(elements).size, 2);
  assert.equal(right - left, reference.described.units * narrow);
  assert.deepEqual(elements, reference.described.runs.map(units => units * narrow));

  // Same drawing as lesson.render at the measured scale, except that each separator can be widened by an integer factor.
  function draw(factor) {
    const { runs } = lesson.describe(raw);
    const scale = narrow, margin = 40, height = 120;
    let gap = 0;
    const px = runs.map((units, i) => units * scale * (i % 8 === 7 ? factor(gap++) : 1));
    const width = px.reduce((a, b) => a + b, 0) + margin * 2;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    let x = margin;
    px.forEach((w, i) => {
      if (i % 2 === 0) {
        for (let y = 20; y < 100; y++) {
          for (let c = x; c < x + w; c++) {
            const k = (y * width + c) * 4;
            data[k] = data[k + 1] = data[k + 2] = 0;
          }
        }
      }
      x += w;
    });
    // Taps moved inwards from the outer edges of the two end bars by the same distance.
    const tap = inset => ({ start: { x: margin + inset, y: 60 }, end: { x: x - inset, y: 60 } });
    return { image: { width, height, data }, tap };
  }
  const same = draw(() => 1);
  assert.deepEqual(same.image, reference.image);
  assert.deepEqual(same.tap(narrow / 2), reference.region);

  // Your image reads between the user's taps: on the outer edges, at the centres or on the inner edges
  // of the narrow end bars, or one narrow width outside them.
  const insets = [0, narrow / 2, narrow, -narrow];
  const result = (factor, inset) => { const { image, tap } = draw(factor); return reader.read(image, tap(inset)); };
  const widened = 3, alternate = [1, 3], rejected = 5;
  for (const inset of insets) {
    assert.equal(result(() => 1, inset).text, '123456', String(inset));
    assert.equal(result(() => widened, inset).text, '123456', String(inset));
    assert.equal(result(i => alternate[i % 2], inset).text, '123456', String(inset));
    assert.equal(result(() => rejected, inset).status, 'unreadable', String(inset));
    assert.equal(result(i => (i === 3 ? rejected : 1), inset).status, 'unreadable', String(inset));
  }

  for (const phrase of [
    `区切りの隙間をすべて細い隙間の${widened}倍に広げても、${alternate[0]}倍と${alternate[1]}倍を交互に並べても、`
      + '結果は`123456`のままである',
    `${rejected}倍に広げた隙間は、この読取器では受け付けない（サンプルと同じく細い幅${narrow}ピクセル・`
      + `太い幅${wide}ピクセルで、区切りだけを広げた画像を描けば、「${messages.ja['tab.photo']}」で試せる）`,
    '読取器は7要素ずつ数えて文字を切り出し',
    'この切り出し方は、スタートビットのあとの決まった数のビットを1文字として受け取る調歩同期式のシリアル通信（UARTなど）'
      + 'と同じであることがわかる',
    'ただし、文字と文字の間の空き時間を問わないUARTと違い、この読取器は区切りの幅に上限を設けている'
  ]) assert.ok(own.ja.includes(phrase), phrase);
  for (const phrase of [
    `Widening every separator of \`${raw}\` to ${words[widened]} times the narrow space, `
      + `or alternating ${words[alternate[0]]} and ${words[alternate[1]]} times, still reads \`123456\``,
    `This reader rejects a separator widened to ${words[rejected]} times (to try it in ${messages.en['tab.photo']}, `
      + `draw the barcode at the sample's scale, with ${narrow}-pixel narrow and ${wide}-pixel wide elements, `
      + 'and widen only the separators)',
    'counting seven elements at a time',
    'this way of cutting out characters matches asynchronous (start-stop) serial communication such as UART',
    'Unlike UART, which accepts any idle time between characters, this reader puts an upper limit on the separator width.'
  ]) assert.ok(own.en.includes(phrase), phrase);
});
