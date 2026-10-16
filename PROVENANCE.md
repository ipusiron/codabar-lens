# Origin

Codabar Lens was extracted from [ipusiron/postmirror](https://github.com/ipusiron/postmirror/tree/da60e295c679b09184d4a400e89e7f4c09290139), under the MIT License.

- `nw7-core.js`, `test/nw7.test.js`, and `test/nw7-vectors.json` retain the existing implementation and independent test vectors unchanged.
- Image loading, the four endpoint taps, image disposal, bilingual messages, the NW-7 lesson, and visual styles derive from PostMirror.
- The global name `PostMirrorNW7` is retained for compatibility with the unchanged decoder tests. It does not load PostMirror or its postal decoder.
- This repository contains no user photographs or real label identifiers.
