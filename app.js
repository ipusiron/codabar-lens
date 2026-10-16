(function () {
  'use strict';
  const nw7 = globalThis.PostMirrorNW7;
  const messages = globalThis.CodabarLensMessages;
  const state = { language: initialLanguage(), tab: new URL(location.href).hash === '#learn' ? 'learn' : 'photo' };
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

  const photo = {
    version: 0, bitmap: null, pixels: null, region: null, crop: null, zoom: null,
    rough: [], precise: [], pitch: 0, step: 'empty', resized: false, read: null, decoded: null
  };
  const photoCanvases = ['photo-overview', 'photo-zoom', 'photo-result'];

  function releasePhoto(clearInput = true) {
    photo.version++;
    if (photo.bitmap) photo.bitmap.close();
    Object.assign(photo, { bitmap: null, pixels: null, region: null, crop: null, zoom: null,
      rough: [], precise: [], pitch: 0, step: 'empty', resized: false, read: null, decoded: null });
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
    photo.zoom = photoRect(point.x - 8 * photo.pitch, point.y - 4 * photo.pitch,
      point.x + 8 * photo.pitch, point.y + 4 * photo.pitch);
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
    const margin = Math.max(4 * photo.pitch, 32);
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
          photo.pitch = Math.hypot(photo.rough[1].x - photo.rough[0].x, photo.rough[1].y - photo.rough[0].y) / 66;
          if (photo.pitch < 1) {
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
    if (state.tab === 'photo' && name !== 'photo') releasePhoto();
    state.tab = name;
    for (const tab of ['photo', 'learn']) {
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
  }

  for (const name of ['photo', 'learn']) {
    const tab = element(`tab-${name}`);
    tab.addEventListener('click', () => showTab(name));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      showTab(event.key === 'Home' ? 'photo' : event.key === 'End' ? 'learn' : name === 'photo' ? 'learn' : 'photo', true);
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
  renderLanguage();
  showTab(state.tab);
})();
