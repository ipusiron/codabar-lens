# Codabar Lens - Inspect and learn NW-7 barcodes

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/codabar-lens?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/codabar-lens?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/codabar-lens)
![GitHub license](https://img.shields.io/github/license/ipusiron/codabar-lens)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/codabar-lens/)

**Day116 - 200 Security Tools Built with Generative AI**

[日本語](README.md)

Codabar Lens reads numbers and symbols from NW-7 (Codabar) photos locally. It extracts the existing NW-7 functionality from PostMirror, retaining its visual style, four endpoint taps, bilingual interface and dark theme.

## 🌐 Demo

[Open Codabar Lens](https://ipusiron.github.io/codabar-lens/). A downloaded `index.html` also works offline.

## 📸 Screenshot

![Fictional Codabar reading](assets/screenshot-en.png)

*Content and start/stop markers are shown separately. Only fictional data is used.*

## ✨ Features

- **Your image**: JPEG, PNG and WebP; four endpoint taps; back, reselect and clear actions
- **Learn**: bar/space widths, character set, start/stop markers, optional check characters and reading limits
- Japanese/English, light/dark themes and arrow/Home/End tab navigation

This release moves the two existing NW-7 tabs. Sample-image experiments, manual decoding and quizzes are not implemented.

## 🔄 Difference from PostMirror

| Item | Codabar Lens | PostMirror |
|---|---|---|
| Format | NW-7 / Codabar | Japan Post customer barcode |
| Encoding | Narrow/wide bars and spaces | Four bar heights/positions |
| Content | Digits and selected symbols; meaning depends on the issuer | Postal code and address number |
| Learning focus | Number encoding and photo inspection | Address information and concealment |

Codabar is a general-purpose linear barcode used on shipping labels and in libraries. JAN and Code 128 are different formats. Identifying Codabar alone does not establish whether its number is a tracking or customer identifier.
Use [PostMirror](https://ipusiron.github.io/postmirror/) for Japan Post customer barcodes.

## 📖 How to use

1. Select a photo you are allowed to inspect.
2. Tap the leftmost and rightmost bars in the full image.
3. Refine each endpoint in its enlarged view, at the middle height of the bars.
4. Compare the decoded content and markers with the printed text.

There are four taps in total. Use Back one step or Select the region again to correct a selection.

## 🎯 Use cases

- Separate fictional `A123456A` into content `123456` and its two `A` markers.
- Learn that different start/stop markers such as `A12B` are permitted.
- Compare equal-height NW-7 bars with other formats such as JAN and Code 128.
- Check whether an identifier in your own photo is readable before sharing that photo.

## ⚠️ Scope and limits

- 2–80 content characters: digits 0–9 and `- $ : / . +`, with A–D start/stop markers.
- Optional check characters are retained. Their presence and application-specific validity are not inferred.
- No full-image automatic detection, perspective correction, HEIC, camera capture, JAN, Code 128, ITF or QR decoding.
- Region selection requires taps or clicks; keyboard-only selection is not implemented.
- Missing characters are not guessed. Failed readings display no content; failure does not prove other methods cannot read it.
- No address, identity or delivery lookup; no image/result export or sharing.

## 🔒 Data handling

Photos stay on the device. Leaving Your image clears its photo and result. Images over 16,777,216 pixels are resized below that limit.
Only the language preference is stored in `localStorage`. There are no runtime dependencies, CDNs or external fonts. External links open their destinations only when activated.

## 🔗 References

- [BarTender: Codabar structure](https://barcodeguide.seagullscientific.com/Content/Symbologies/Codabar.htm)
- [STRICH: optional check characters](https://docs.strich.io/codabar.html)
- [Mitsubishi Logistics glossary](https://www.mitsubishi-logistics.co.jp/glossary.html)
- [Japan Post customer-barcode address data](https://www.post.japanpost.jp/service/search/zipcode/zipmanual/p17.html)
- [Code provenance](PROVENANCE.md)

## 📁 Files

```text
codabar-lens/
├── .github/workflows/test.yml
├── .gitignore
├── LICENSE
├── PROVENANCE.md
├── CLAUDE.md
├── README.md
├── README.en.md
├── package.json
├── index.html
├── style.css
├── app.js
├── messages.js
├── nw7-core.js
├── assets/
│   ├── screenshot.png
│   └── screenshot-en.png
└── test/
    ├── nw7.test.js
    ├── nw7-vectors.json
    └── ui.test.js
```

## 💻 Requirements

Current Chromium, Firefox and Safari-family browsers with JavaScript enabled. Supports `file://` and HTTP.
For development, run `npm test` with Node.js 22 or later. No package installation is required.

## 📄 License

[MIT License](LICENSE). The copyright notice from PostMirror is retained.

## 🛠️ About this tool

Part of the 200 Security Tools Built with Generative AI project: a series of security-related tools developed and published over 100 days with AI assistance.
[Project overview](https://akademeia.info/?page_id=44607)
