(function () {
  'use strict';
  const nw7 = globalThis.PostMirrorNW7;
  const messages = globalThis.CodabarLensMessages;
  const state = { language: initialLanguage(), tab: new URL(location.href).hash === '#learn' ? 'learn' : 'decode' };
  const element = id => document.getElementById(id);
  const translate = (key, params = {}) => messages[state.language][key].replace(/\{(\w+)\}/g, (_, name) => String(params[name]));

  function initialLanguage() {
    const query = new URLSearchParams(location.search).get('lang');
    if (['ja', 'en'].includes(query)) return query;
    try {
      const saved = localStorage.getItem('codabar-lens.lang');
      if (['ja', 'en'].includes(saved)) return saved;
    } catch (_) { /* The browser may block storage. */ }
    return navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  }

  const lesson = globalThis.CodabarLensLesson;
  const tabNames = ['decode', 'lab', 'photo', 'learn', 'quiz'];
  const training = { sample: 0, character: 0, sampleFrame: null, sampleRead: null,
    labSample: 0, effect: 'none', labFrame: null, labRead: null, answers: Array(7).fill(null), checked: false };

  function make(tag, text, className) {
    const item = document.createElement(tag);
    if (text !== undefined) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function fillSelect(id, options, selected) {
    const select = element(id);
    select.replaceChildren(...options.map(([value, label]) => {
      const option = make('option', label);
      option.value = String(value);
      return option;
    }));
    select.value = String(selected);
  }

  function paintFrame(id, frame, selected) {
    const canvas = element(id), { image } = frame;
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
    if (selected !== undefined) {
      const character = frame.described.characters[selected];
      context.strokeStyle = '#0a58a8';
      context.lineWidth = 2;
      context.strokeRect(40 + character.start * 3 - 2, 12, (character.end - character.start) * 3 + 4, 96);
    }
  }

  function computeSample() {
    training.sampleFrame = lesson.render(lesson.samples[training.sample].raw);
    training.sampleRead = nw7.read(training.sampleFrame.image, training.sampleFrame.region);
  }

  function computeLab() {
    training.labFrame = lesson.render(lesson.samples[training.labSample].raw, training.effect);
    training.labRead = nw7.read(training.labFrame.image, training.labFrame.region);
  }

  function sampleOptions() {
    return lesson.samples.map((sample, index) => [index, translate('sample.' + sample.id) + ': ' + sample.raw]);
  }

  function renderSample() {
    if (!training.sampleFrame) computeSample();
    const sample = lesson.samples[training.sample], result = training.sampleRead;
    fillSelect('sample-select', sampleOptions(), training.sample);
    paintFrame('sample-canvas', training.sampleFrame, training.character);
    element('sample-canvas').setAttribute('aria-label', translate('sample.image', { raw: sample.raw }));
    element('sample-value').textContent = result.status === 'read' ? result.text : translate('lab.status.unreadable');
    element('sample-value').dataset.status = result.status;
    element('sample-guards').textContent = result.status === 'read'
      ? translate('nw7.guards', result) : '';
    const characters = training.sampleFrame.described.characters;
    const role = index => index === 0 ? 'start' : index === characters.length - 1 ? 'stop' : 'content';
    fillSelect('sample-character', characters.map((c, index) => [index,
      translate('sample.characterOption', { position: index + 1, symbol: c.symbol, role: translate('sample.' + role(index)) })]),
    training.character);
    const c = characters[training.character];
    element('sample-character-title').textContent = translate('sample.characterTitle', {
      position: training.character + 1, total: characters.length, symbol: c.symbol
    });
    const canvas = element('sample-character-canvas');
    canvas.width = (c.end - c.start) * 12 + 24;
    canvas.height = 120;
    canvas.setAttribute('aria-label', translate('sample.characterImage', { symbol: c.symbol }));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    let x = 12;
    c.widths.forEach((width, index) => {
      if (index % 2 === 0) context.fillRect(x, 20, width * 12, 80);
      x += width * 12;
    });
    element('sample-elements').replaceChildren(...c.widths.map((width, index) => {
      const li = make('li');
      li.append(make('span', translate(index % 2 === 0 ? 'sample.bar' : 'sample.space', { n: Math.floor(index / 2) + 1 })),
        make('strong', translate(width === 1 ? 'sample.narrow' : 'sample.wide')));
      return li;
    }));
    element('sample-previous').disabled = training.character === 0;
    element('sample-next').disabled = training.character === characters.length - 1;
  }

  function renderLab() {
    if (!training.labFrame) computeLab();
    fillSelect('experiment-sample', sampleOptions(), training.labSample);
    fillSelect('experiment-effect', lesson.effects.map(effect => [effect, translate('experiment.effect.' + effect)]), training.effect);
    paintFrame('experiment-canvas', training.labFrame);
    const raw = lesson.samples[training.labSample].raw, result = training.labRead;
    const status = result.status !== 'read' ? 'unreadable'
      : result.start + result.text + result.stop === raw ? 'match' : 'mismatch';
    element('experiment-canvas').setAttribute('aria-label', translate('experiment.image', {
      raw, effect: translate('experiment.effect.' + training.effect)
    }));
    element('experiment-status').textContent = translate('experiment.status.' + status);
    element('experiment-status').dataset.status = status;
    element('experiment-expected').textContent = raw.slice(1, -1);
    element('experiment-value').textContent = result.status === 'read' ? result.text : '';
    element('experiment-read').hidden = result.status !== 'read';
    element('experiment-guards').textContent = result.status === 'read' ? translate('nw7.guards', result) : '';
    element('experiment-note').textContent = translate('experiment.note.' + training.effect);
  }

  function renderQuizFeedback() {
    const graded = lesson.grade(training.answers);
    element('quiz-score').textContent = training.checked ? translate('quiz.score', graded) : translate('quiz.notGraded');
    element('quiz-score').dataset.graded = String(training.checked);
    lesson.questions.forEach((q, index) => {
      const feedback = element('quiz-feedback-' + q.id);
      feedback.hidden = !training.checked;
      feedback.replaceChildren();
      if (training.checked) feedback.append(make('strong', translate('quiz.' + graded.statuses[index])),
        make('p', translate('quiz.' + q.id + '.explanation')));
    });
  }

  function renderQuiz() {
    element('quiz-questions').replaceChildren(...lesson.questions.map((q, index) => {
      const fieldset = make('fieldset');
      fieldset.append(make('legend', `${index + 1}. ${translate('quiz.' + q.id + '.question')}`));
      for (let choice = 0; choice < 3; choice++) {
        const label = make('label', undefined, 'quiz-choice');
        const input = make('input');
        input.type = 'radio'; input.name = 'quiz-' + q.id; input.value = String(choice);
        input.checked = training.answers[index] === choice;
        input.addEventListener('change', () => {
          training.answers[index] = choice;
          training.checked = false;
          renderQuizFeedback();
        });
        label.append(input, make('span', translate('quiz.' + q.id + '.choice.' + choice)));
        fieldset.append(label);
      }
      const feedback = make('div', undefined, 'quiz-feedback');
      feedback.id = 'quiz-feedback-' + q.id;
      fieldset.append(feedback);
      return fieldset;
    }));
    renderQuizFeedback();
  }

  function buildTraining() {
    element('sample-select').addEventListener('change', event => {
      training.sample = Number(event.target.value); training.character = 0;
      computeSample(); renderSample();
    });
    element('sample-character').addEventListener('change', event => {
      training.character = Number(event.target.value); renderSample();
    });
    for (const [id, offset] of [['sample-previous', -1], ['sample-next', 1]]) {
      element(id).addEventListener('click', () => {
        training.character += offset;
        renderSample();
        if (element(id).disabled) {
          element(offset > 0 ? 'sample-previous' : 'sample-next').focus();
        }
      });
    }
    element('sample-open-lab').addEventListener('click', () => {
      training.labSample = training.sample; training.effect = 'none'; computeLab(); renderLab(); showTab('lab', true);
    });
    element('experiment-sample').addEventListener('change', event => {
      training.labSample = Number(event.target.value); computeLab(); renderLab();
    });
    element('experiment-effect').addEventListener('change', event => {
      training.effect = event.target.value; computeLab(); renderLab();
    });
    element('experiment-reset').addEventListener('click', () => {
      training.effect = 'none'; computeLab(); renderLab();
    });
    element('quiz-check').addEventListener('click', () => { training.checked = true; renderQuizFeedback(); });
    element('quiz-reset').addEventListener('click', () => {
      training.answers.fill(null); training.checked = false; renderQuiz();
    });
  }


  const photo = {
    version: 0, bitmap: null, pixels: null, region: null, crop: null, zoom: null,
    rough: [], precise: [], span: 0, step: 'empty', resized: false, read: null, decoded: null
  };
  const photoCanvases = ['photo-overview', 'photo-zoom', 'photo-result'];

  function releasePhoto(clearInput = true) {
    photo.version++;
    if (photo.bitmap) photo.bitmap.close();
    Object.assign(photo, { bitmap: null, pixels: null, region: null, crop: null, zoom: null,
      rough: [], precise: [], span: 0, step: 'empty', resized: false, read: null, decoded: null });
    for (const id of photoCanvases) {
      element(id).width = 0;
      element(id).height = 0;
    }
    if (clearInput) element('photo-file').value = '';
    renderPhoto();
  }

  function photoFailure() {
    releasePhoto(false);
    photo.step = 'error';
    renderPhoto();
  }

  async function loadPhoto(file) {
    releasePhoto(false);
    if (!file) return;
    const version = photo.version;
    photo.step = 'loading';
    renderPhoto();
    let bitmap = null;
    try {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Unsupported image');
      bitmap = await createImageBitmap(file);
      if (version !== photo.version) return;
      const limit = 16777216;
      if (bitmap.width * bitmap.height > limit) {
        const scale = Math.sqrt(limit / (bitmap.width * bitmap.height));
        const resized = await createImageBitmap(bitmap, {
          resizeWidth: Math.max(1, Math.floor(bitmap.width * scale)),
          resizeHeight: Math.max(1, Math.floor(bitmap.height * scale))
        });
        bitmap.close();
        bitmap = resized;
        if (version !== photo.version) return;
        photo.resized = true;
      }
      photo.bitmap = bitmap;
      bitmap = null;
      resetPhotoRegion();
    } catch (_) {
      if (version === photo.version) photoFailure();
    } finally {
      if (bitmap) bitmap.close();
    }
  }

  function photoRect(left, top, right, bottom) {
    const x = Math.max(0, Math.floor(left)), y = Math.max(0, Math.floor(top));
    const width = Math.min(photo.bitmap.width, Math.ceil(right)) - x;
    const height = Math.min(photo.bitmap.height, Math.ceil(bottom)) - y;
    if (width < 1 || height < 1) throw new Error('Empty image region');
    return { x, y, width, height };
  }

  function drawPhotoCrop(canvas, rect, width = rect.width, height = rect.height) {
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(photo.bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
    return context;
  }

  function resetPhotoRegion() {
    if (!photo.bitmap) return;
    photo.rough = [];
    photo.precise = [];
    photo.pixels = photo.region = photo.crop = photo.zoom = photo.read = photo.decoded = null;
    photo.step = 'rough';
    for (const id of ['photo-zoom', 'photo-result']) {
      element(id).width = 0;
      element(id).height = 0;
    }
    paintPhotoOverview();
    renderPhoto();
    element('photo-step').scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function paintPhotoOverview() {
    const scale = Math.min(1, 1600 / Math.max(photo.bitmap.width, photo.bitmap.height));
    const canvas = element('photo-overview');
    const context = drawPhotoCrop(canvas, photoRect(0, 0, photo.bitmap.width, photo.bitmap.height),
      Math.max(1, Math.round(photo.bitmap.width * scale)), Math.max(1, Math.round(photo.bitmap.height * scale)));
    const point = photo.rough[0];
    if (!point) return;
    const unit = canvas.width / canvas.clientWidth;
    context.beginPath();
    context.arc(point.x * canvas.width / photo.bitmap.width, point.y * canvas.height / photo.bitmap.height, 8 * unit, 0, Math.PI * 2);
    context.lineWidth = 5 * unit;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg');
    context.stroke();
    context.lineWidth = 3 * unit;
    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
    context.stroke();
  }

  function backPhotoStep() {
    if (!photo.bitmap) return;
    photo.pixels = photo.region = photo.crop = photo.read = photo.decoded = null;
    element('photo-result').width = element('photo-result').height = 0;
    if (photo.precise.length) {
      photo.precise.pop();
      showPhotoZoom();
    } else {
      photo.rough.pop();
      photo.zoom = null;
      photo.step = 'rough';
      element('photo-zoom').width = element('photo-zoom').height = 0;
      renderPhoto();
      paintPhotoOverview();
      element('photo-step').scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }

  function canvasPoint(event, rect) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return { x: rect.x + (event.clientX - bounds.left - canvas.clientLeft) * rect.width / canvas.clientWidth,
      y: rect.y + (event.clientY - bounds.top - canvas.clientTop) * rect.height / canvas.clientHeight };
  }

  function showPhotoZoom() {
    const point = photo.rough[photo.precise.length];
    // Codabar has a variable number of bars. Size the view from the selected
    // span, with enough context to adjust endpoints on small images too.
    const halfWidth = Math.max(24, photo.span / 8);
    const halfHeight = Math.max(16, photo.span / 16);
    photo.zoom = photoRect(point.x - halfWidth, point.y - halfHeight,
      point.x + halfWidth, point.y + halfHeight);
    drawPhotoCrop(element('photo-zoom'), photo.zoom);
    photo.step = photo.precise.length ? 'right' : 'left';
    renderPhoto();
    element('photo-step').scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function readPhoto() {
    photo.read = nw7.read(photo.pixels, photo.region);
    photo.step = 'result';
    renderPhoto();
    paintPhotoResult();
    element('photo-result-title').focus();
  }

  function finishPhotoRegion() {
    const [start, end] = photo.precise;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    // Retain the quiet zones scanned beyond the precise endpoints by nw7.read.
    const margin = Math.max(length * 0.08, 32);
    photo.crop = photoRect(Math.min(start.x, end.x) - margin, Math.min(start.y, end.y) - margin,
      Math.max(start.x, end.x) + margin, Math.max(start.y, end.y) + margin);
    photo.region = { start: { x: start.x - photo.crop.x, y: start.y - photo.crop.y },
      end: { x: end.x - photo.crop.x, y: end.y - photo.crop.y } };
    const canvas = element('photo-result');
    const context = drawPhotoCrop(canvas, photo.crop);
    photo.pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    readPhoto();
  }

  function paintPhotoResult() {
    if (photo.step !== 'result' || !photo.pixels || state.tab !== 'photo') return;
    const canvas = element('photo-result');
    canvas.style.width = `${element('photo-result-wrap').clientWidth}px`;
    canvas.width = photo.pixels.width;
    canvas.height = photo.pixels.height;
    canvas.getContext('2d').putImageData(photo.pixels, 0, 0);
  }

  function renderPhoto() {
    const loaded = photo.bitmap !== null;
    const located = photo.read !== null && photo.read.status === 'read';
    const selecting = ['rough', 'left', 'right'].includes(photo.step);
    const tap = photo.step === 'rough' ? photo.rough.length + 1 : photo.step === 'left' ? 3 : photo.step === 'right' ? 4 : 0;
    element('photo-work').hidden = !loaded;
    element('photo-progress').hidden = !selecting;
    element('photo-progress').querySelectorAll('li').forEach((item, index) => {
      if (index + 1 === tap) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    element('photo-step').textContent = selecting ? translate(`photo.step.${tap}`) : '';
    element('photo-position').textContent = selecting ? translate(tap < 3 ? 'photo.roughHint' : 'nw7.tapBand') : '';
    element('photo-step').dataset.step = photo.step;
    element('photo-notice').textContent = photo.step === 'error' ? translate('photo.error')
      : photo.step === 'loading' ? translate('photo.loading')
        : photo.read?.status === 'unreadable' ? translate('nw7.noGrid') : photo.resized ? translate('photo.resized') : '';
    element('photo-overview').hidden = photo.step !== 'rough';
    element('photo-zoom').hidden = !['left', 'right'].includes(photo.step);
    element('photo-output').hidden = photo.step !== 'result';
    element('photo-nw7-output').hidden = !located;
    element('photo-nw7-value').textContent = located ? photo.read.text : '';
    element('photo-nw7-guards').textContent = located
      ? translate('nw7.guards', { start: photo.read.start, stop: photo.read.stop }) : '';
    element('photo-failure').hidden = !photo.read || located;
    element('photo-back').disabled = !loaded || (!photo.rough.length && !photo.precise.length);
    element('photo-reselect').disabled = !loaded;
    element('photo-clear').disabled = photo.step === 'empty';
    element('photo-overview').setAttribute('aria-label', translate(`photo.step.${photo.rough.length ? 2 : 1}`));
    element('photo-zoom').setAttribute('aria-label', translate(`photo.step.${photo.step === 'right' ? 4 : 3}`));
    for (const id of ['photo-result', 'photo-result-wrap']) element(id).setAttribute('aria-label', translate('nw7.resultImage'));
    element('photo-status').textContent = photo.read ? translate(`lab.status.${photo.read.status}`) : '';
    if (photo.read) element('photo-status').dataset.status = photo.read.status;
    else delete element('photo-status').dataset.status;
  }

  function buildPhoto() {
    element('photo-file').addEventListener('change', event => loadPhoto(event.target.files[0]));
    element('photo-clear').addEventListener('click', () => releasePhoto());
    element('photo-back').addEventListener('click', () => {
      try { backPhotoStep(); } catch (_) { photoFailure(); }
    });
    element('photo-reselect').addEventListener('click', () => {
      try { resetPhotoRegion(); } catch (_) { photoFailure(); }
    });
    element('photo-overview').addEventListener('click', event => {
      if (photo.step !== 'rough') return;
      try {
        photo.rough.push(canvasPoint(event, { x: 0, y: 0, width: photo.bitmap.width, height: photo.bitmap.height }));
        if (photo.rough.length === 1) {
          paintPhotoOverview();
          renderPhoto();
          element('photo-step').scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
        if (photo.rough.length === 2) {
          photo.span = Math.hypot(photo.rough[1].x - photo.rough[0].x, photo.rough[1].y - photo.rough[0].y);
          if (photo.span <= 1) {
            resetPhotoRegion();
            element('photo-notice').textContent = translate('photo.retry');
          } else showPhotoZoom();
        }
      } catch (_) { photoFailure(); }
    });
    element('photo-zoom').addEventListener('click', event => {
      if (!['left', 'right'].includes(photo.step)) return;
      try {
        photo.precise.push(canvasPoint(event, photo.zoom));
        if (photo.precise.length === 1) showPhotoZoom();
        else finishPhotoRegion();
      } catch (_) { photoFailure(); }
    });
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(paintPhotoResult).observe(element('photo-result-wrap'));
    } else addEventListener('resize', paintPhotoResult);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintPhotoResult);
  }

  function showTab(name, focus = false) {
    if (!tabNames.includes(name)) return;
    if (state.tab === 'photo' && name !== 'photo') releasePhoto();
    state.tab = name;
    for (const tab of tabNames) {
      const selected = tab === name;
      element(`tab-${tab}`).setAttribute('aria-selected', String(selected));
      element(`tab-${tab}`).tabIndex = selected ? 0 : -1;
      element(`panel-${tab}`).hidden = !selected;
    }
    if (focus) element(`tab-${name}`).focus();
  }

  function renderLanguage() {
    document.documentElement.lang = state.language;
    document.title = translate('page.title');
    document.querySelectorAll('[data-i18n]').forEach(item => { item.textContent = translate(item.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach(item => {
      item.setAttribute('aria-label', translate(item.dataset.i18nLabel));
    });
    element('lang-toggle').textContent = translate('language.target');
    element('lang-toggle').setAttribute('aria-label', translate('language.target'));
    element('lang-toggle').lang = state.language === 'ja' ? 'en' : 'ja';
    renderPhoto();
    renderSample();
    renderLab();
    renderQuiz();
  }

  for (const name of tabNames) {
    const tab = element(`tab-${name}`);
    tab.addEventListener('click', () => showTab(name));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === 'ArrowLeft' ? -1 : 1;
      const next = event.key === 'Home' ? tabNames[0] : event.key === 'End' ? tabNames.at(-1)
        : tabNames[(tabNames.indexOf(name) + offset + tabNames.length) % tabNames.length];
      showTab(next, true);
    });
  }
  element('nw7-open-photo').addEventListener('click', () => showTab('photo', true));
  let languageRender = 0;
  element('lang-toggle').addEventListener('click', () => {
    const version = ++languageRender;
    const live = [...document.querySelectorAll('[aria-live]')].filter(item => item.id !== 'language-announcement');
    live.forEach(item => { item.setAttribute('aria-live', 'off'); });
    state.language = state.language === 'ja' ? 'en' : 'ja';
    try { localStorage.setItem('codabar-lens.lang', state.language); } catch (_) { /* Keep the current view usable. */ }
    renderLanguage();
    element('language-announcement').textContent = translate('language.changed');
    // Keep translated content silent through rendering, then resume normal operation announcements.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (version === languageRender) live.forEach(item => { item.setAttribute('aria-live', 'polite'); });
    }));
  });
  buildPhoto();
  buildTraining();
  renderLanguage();
  showTab(state.tab);
})();
