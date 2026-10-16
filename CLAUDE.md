# Codabar Lens development

This is the Day116 standalone NW-7 (Codabar) tool extracted from PostMirror. Preserve its mobile-first appearance and five-tab functionality.

- `nw7-core.js` and `test/nw7*` are unchanged from the source documented in PROVENANCE.md. Keep independent expected values; never weaken them to pass tests.
- `app.js` owns image loading, four endpoint taps, reading, display and bitmap disposal. Never include the postal decoder or infer addresses from NW-7 identifiers.
- `messages.js` contains all Japanese/English UI messages. `index.html` has Sample decode, Image lab, Your image, Learn and Quiz tabs; `style.css` retains PostMirror colors and 44px controls.
- Only store the `codabar-lens.lang` preference. Do not persist or transmit images, numbers or results, or add camera access, lookups, sharing or tracking.
- Preserve generation checks during asynchronous image loading, the 16,777,216-pixel processing limit, and disposal on clear or tab exit.
- Keep classic deferred scripts and file:// support. No dependencies, modules, CDN, networking, unsafe HTML insertion or inline event handlers.
- Use synthetic fixtures/screenshots only. Never commit private photos, identifiers, local paths or internal documents.
- `npm test` requires Node.js 22+ and no installation. Run syntax checks on the four JavaScript sources.
- Verify HTTP/file://, Japanese/English, 320/390/1280px, dark/light, Chromium/Firefox/WebKit and visible screenshots. Test reading, failure, back/reselect/clear, language changes and disposal during delayed loading.
- The user authorized five tabs after the initial extraction. `lesson-core.js` provides three fictional samples, seven-element character widths, five raster treatments and grading for seven questions. Read sample/experimental images through the unchanged NW-7 reader and compare against known content; do not present the known answer as a successful reading.
- Language/tab changes preserve sample selections and quiz answers in memory. Personal photo disposal is unchanged. Changing an answer invalidates old grading; reset clears all answers.
- New formats and unrestricted manual encoding/decoding remain outside this feature scope. Never infer addresses or check-character presence from a number.
