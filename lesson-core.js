(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CodabarLensLesson = api;
})(globalThis, function () {
  'use strict';
  // Codabar symbol facts, independently checked against the existing ZXing-C++ vectors.
  const alphabet = '0123456789-$:/.+ABCD';
  const patterns = [3, 6, 9, 96, 18, 66, 33, 36, 48, 72, 12, 24, 69, 81, 84, 21, 26, 41, 11, 14];
  const samples = Object.freeze([
    Object.freeze({ id: 'digits', raw: 'A123456A' }),
    Object.freeze({ id: 'guards', raw: 'B12D' }),
    Object.freeze({ id: 'symbols', raw: 'C0123456789-$:/.+B' })
  ]);
  const effects = Object.freeze(['none', 'upper', 'stripe', 'character', 'whole']);
  const questions = Object.freeze([
    Object.freeze({ id: 'width', correct: 1 }),
    Object.freeze({ id: 'elements', correct: 2 }),
    Object.freeze({ id: 'guards', correct: 0 }),
    Object.freeze({ id: 'characters', correct: 1 }),
    Object.freeze({ id: 'check', correct: 2 }),
    Object.freeze({ id: 'meaning', correct: 0 }),
    Object.freeze({ id: 'failure', correct: 1 })
  ]);

  function describe(raw) {
    if (typeof raw !== 'string' || !/^[ABCD][0-9\-$:/.+]{2,80}[ABCD]$/.test(raw)) {
      throw new RangeError('Expected 2-80 Codabar content characters and A-D guards');
    }
    const runs = [], characters = [];
    let position = 0;
    [...raw].forEach((symbol, index) => {
      const pattern = patterns[alphabet.indexOf(symbol)];
      const widths = Array.from({ length: 7 }, (_, n) => (pattern >> (6 - n)) & 1 ? 2 : 1);
      const length = widths.reduce((a, b) => a + b, 0);
      characters.push({ symbol, index, start: position, end: position + length, widths });
      runs.push(...widths);
      position += length;
      if (index < raw.length - 1) { runs.push(1); position++; }
    });
    return { raw, runs, characters, units: position };
  }

  function render(raw, effect = 'none') {
    if (!effects.includes(effect)) throw new RangeError('Unknown image treatment');
    const described = describe(raw);
    const scale = 3, margin = 40, height = 120;
    const width = described.units * scale + margin * 2;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    function rectangle(left, top, right, bottom, gray) {
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const k = (y * width + x) * 4;
          data[k] = data[k + 1] = data[k + 2] = gray;
        }
      }
    }
    let x = margin;
    described.runs.forEach((units, index) => {
      if (index % 2 === 0) rectangle(x, 20, x + units * scale, 100, 0);
      x += units * scale;
    });
    const covered = described.characters[Math.floor(raw.length / 2)];
    if (effect === 'upper') rectangle(margin, 20, x, 55, 0);
    if (effect === 'stripe') rectangle(margin, 58, x, 62, 0);
    if (effect === 'character') rectangle(margin + covered.start * scale - 1, 20,
      margin + covered.end * scale + 1, 100, 255);
    if (effect === 'whole') rectangle(margin, 20, x, 100, 0);
    return { image: { width, height, data }, region: {
      start: { x: margin + described.runs[0] * scale / 2, y: 60 },
      end: { x: x - described.runs.at(-1) * scale / 2, y: 60 }
    }, described };
  }

  function grade(answers) {
    if (!Array.isArray(answers) || answers.length !== questions.length
      || answers.some(answer => answer !== null && ![0, 1, 2].includes(answer))) {
      throw new RangeError('Expected one answer or null for each question');
    }
    const statuses = answers.map((answer, index) => answer === null ? 'unanswered'
      : answer === questions[index].correct ? 'correct' : 'incorrect');
    return { statuses, correct: statuses.filter(s => s === 'correct').length,
      unanswered: statuses.filter(s => s === 'unanswered').length, total: questions.length };
  }

  return Object.freeze({ samples, effects, questions, describe, render, grade });
});
