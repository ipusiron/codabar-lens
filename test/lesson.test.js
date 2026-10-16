'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const lesson = require('../lesson-core.js');
const reader = require('../nw7-core.js');
const vectors = require('./nw7-vectors.json').vectors;

test('Lesson widths agree with independent Codabar writer vectors, including all guards and symbols', () => {
  const selected = vectors.filter(v => v.format === 'Codabar' && v.raw.length <= 82);
  assert.ok(selected.length >= 16);
  for (const v of selected) assert.deepEqual(lesson.describe(v.raw).runs, v.runs, v.raw);
});

test('Three fictional samples read back exactly and every displayed character has four bars and three spaces', () => {
  for (const sample of lesson.samples) {
    const { image, region, described } = lesson.render(sample.raw);
    assert.deepEqual(reader.read(image, region), { status: 'read', format: 'Codabar', text: sample.raw.slice(1, -1),
      start: sample.raw[0], stop: sample.raw.at(-1) });
    assert.equal(described.characters.map(c => c.symbol).join(''), sample.raw);
    for (const c of described.characters) {
      assert.equal(c.widths.length, 7);
      assert.equal(c.widths.filter((_, i) => i % 2 === 0).length, 4);
      assert.equal(c.widths.filter(w => w === 2).length, '-0123456789$'.includes(c.symbol) ? 2 : 3);
    }
  }
});

test('Image treatments read remaining scanlines but do not invent a hidden character', () => {
  for (const sample of lesson.samples) {
    for (const effect of lesson.effects) {
      const { image, region } = lesson.render(sample.raw, effect);
      const result = reader.read(image, region);
      if (['none', 'upper', 'stripe'].includes(effect)) {
        assert.equal(result.status, 'read', sample.raw + ':' + effect);
        assert.equal(result.text, sample.raw.slice(1, -1));
      } else {
        assert.equal(result.status, 'unreadable', sample.raw + ':' + effect);
        assert.equal(result.text, null);
      }
    }
  }
});

test('Sample rendering is bounded, rejects invalid input and does not mutate prior images', () => {
  const first = lesson.render('A12A');
  const before = first.image.data.slice();
  const max = lesson.render('B' + '9'.repeat(80) + 'D');
  assert.ok(max.image.width * max.image.height < 1000000);
  assert.deepEqual(first.image.data, before);
  for (const raw of ['', '12', 'A1A', 'A123E', 'a12a', 'AA12A', 'A' + '9'.repeat(81) + 'A', null, '<script>']) {
    assert.throws(() => lesson.render(raw), RangeError);
  }
  assert.throws(() => lesson.render('A12A', 'unknown'), RangeError);
});

test('Quiz answers from the referenced lesson facts distinguish correct, wrong and unanswered', () => {
  const correct = [1, 2, 0, 1, 2, 0, 1];
  assert.deepEqual(lesson.grade(correct), { statuses: Array(7).fill('correct'), correct: 7, unanswered: 0, total: 7 });
  const mixed = [1, null, 2, 1, 0, null, 1];
  assert.deepEqual(lesson.grade(mixed), { statuses: ['correct', 'unanswered', 'incorrect', 'correct', 'incorrect', 'unanswered', 'correct'],
    correct: 3, unanswered: 2, total: 7 });
  assert.throws(() => lesson.grade([]), RangeError);
  assert.throws(() => lesson.grade([1, 2, 0, 1, 2, 0, 9]), RangeError);
});
