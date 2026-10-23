# Favicon Kit

A tiny, dependency-free favicon generator that lives entirely in your browser. Upload one square PNG and download a complete favicon set as a ZIP, including the HTML to install it.

**[Deployed here](https://raeid-u.github.io/favicon-kit/)**

## Why build this?

Most favicon generators are a little too much for what should be a simple task. This project is a small, hackable static website: no backend, accounts, image upload, paid API, build system, or runtime dependencies.

### Features

- Drag-and-drop or pick a **square PNG** (16–4096 px, up to 10 MB).
- Pixel-art (`nearest neighbor`) or smooth scaling.
- Real **multi-image `.ico`** with 16, 32, and 48 px PNG frames.
- Standalone 16, 32, and 48 px PNGs, 180 px Apple touch icon, and 192/512 px Android icons.
- Generate `site.webmanifest` with editable app name, short name, theme, and background colors.
- Generate `HEAD_SNIPPET.html` and installation instructions.
- Download everything in one ZIP. Icons keep their transparent backgrounds.
- Entirely client-side: your uploaded image never leaves your device.
- Works on mobile and desktop. No dependencies or backend.

## Generated files

| File | Use |
| --- | --- |
| `favicon.ico` | Multi-size ICO (16, 32, 48 px) |
| `favicon-16x16.png` | Tab fallback |
| `favicon-32x32.png` | Tab fallback |
| `favicon-48x48.png` | Higher-resolution PNG |
| `apple-touch-icon.png` | Apple home screen (180×180) |
| `android-chrome-192x192.png` | Web manifest icon (192×192) |
| `android-chrome-512x512.png` | Web manifest icon (512×512) |
| `site.webmanifest` | Web app icon metadata |
| `HEAD_SNIPPET.html` | Copy/paste into your site's `<head>` |
| `README.txt` | Installation notes |

Put the files at the public root of your site, e.g. `public/` in Vite or Next.js, then copy the HTML snippet into the page `<head>`. The generated manifest uses absolute root paths (`/`); change those paths if your target app is hosted in a subdirectory. The tool itself is compatible with subdirectory hosting on GitHub Pages.

### About transparency, pixel art, and source size

Image transparency is preserved. The color pickers change the **manifest metadata**, not the icon pixels. Use a 512×512 or larger source for maximum resolution. Smaller images still work and are scaled up; **pixel sharp** retains hard pixels and **smooth** blends edges. PNG-in-ICO is supported by modern browsers and Windows; legacy environments may need BMP-encoded ICO frames.

The manifest supplies icons and appearance metadata only. It does **not** add a service worker or fully configure a PWA. Maskable icons are deliberately not emitted: a maskable icon requires deliberate artwork padding/safe-zone handling, not simply tagging an existing square as `maskable`.

## How it works

- `site/main.js`: upload, preview, HTML canvas rendering, user interaction, and downloads.
- `site/lib/pack.js`: ICO container, ZIP (store mode), CRC32, manifest, and HTML helpers.
- `site/style.css`: responsive layout and design tokens.
- `tests/pack.test.mjs`: regression tests for binary formats and metadata.

The ZIP builder uses no compression because PNG content is already compressed. Source is written in modern native JavaScript modules.

## License

MIT for code. Your uploaded images remain yours (or their respective owners')
This project does not claim rights over them. Please honor any third-party asset licenses when publishing icons.
