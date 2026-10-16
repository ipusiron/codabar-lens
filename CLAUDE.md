# Codabar Lens development

This is the Day116 standalone NW-7 (Codabar) tool extracted from PostMirror. Preserve its mobile-first appearance and existing two-tab functionality.

- `nw7-core.js` and `test/nw7*` are unchanged from the source documented in PROVENANCE.md. Keep independent expected values; never weaken them to pass tests.
- `app.js` owns image loading, four endpoint taps, reading, display and bitmap disposal. Never include the postal decoder or infer addresses from NW-7 identifiers.
- `messages.js` contains all Japanese/English UI messages. `index.html` has Your image and Learn tabs; `style.css` retains PostMirror colors and 44px controls.
- Only store the `codabar-lens.lang` preference. Do not persist or transmit images, numbers or results, or add camera access, lookups, sharing or tracking.
- Preserve generation checks during asynchronous image loading, the 16,777,216-pixel processing limit, and disposal on clear or tab exit.
- Keep classic deferred scripts and file:// support. No dependencies, modules, CDN, networking, unsafe HTML insertion or inline event handlers.
- Use synthetic fixtures/screenshots only. Never commit private photos, identifiers, local paths or internal documents.
- `npm test` requires Node.js 22+ and no installation. Run syntax checks on the three JavaScript sources.
- Verify HTTP/file://, Japanese/English, 320/390/1280px, dark/light, Chromium/Firefox/WebKit and visible screenshots. Test reading, failure, back/reselect/clear, language changes and disposal during delayed loading.
- New formats, sample experiments, manual decoding and quizzes require a separate feature scope. This extraction adds no decoder capability.
