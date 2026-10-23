import { buildIco, buildZip, manifestJson, htmlSnippet, filenameSlug } from './lib/pack.js';

const $ = (selector) => document.querySelector(selector);
const el = {
  picker: $('#file-input'),
  drop: $('#drop-area'),
  dropTitle: $('#drop-title'),
  dropDetails: $('#drop-details'),
  filename: $('#filename'),
  appName: $('#app-name'),
  shortName: $('#short-name'),
  theme: $('#theme-color'),
  background: $('#background-color'),
  pixel: $('#pixel-mode'),
  smooth: $('#smooth-mode'),
  download: $('#download'),
  copy: $('#copy-snippet'),
  snippet: $('#snippet'),
  browserTitle: $('#browser-title'),
  status: $('#status'),
  meta: $('#image-meta'),
  preview: $('#preview'),
  previewBrowser: $('#preview-browser'),
  previewSmall: $('#preview-small'),
  previewTouch: $('#preview-touch'),
  miniPreview: $('#mini-preview'),
  reset: $('#reset')
};

let source = null;
let sourceUrl = null;
let currentMode = 'pixel';

function announce(message, failed = false) {
  el.status.textContent = message;
  el.status.classList.toggle('error', failed);
}

function applyPreview() {
  const cls = currentMode === 'pixel' ? 'pixel-art' : 'smooth-art';
  [el.preview, el.previewBrowser, el.previewSmall, el.previewTouch, el.miniPreview].forEach((item) => {
    item.classList.remove('pixel-art', 'smooth-art');
    item.classList.add(cls);
  });
}

function clearSource() {
  source = null;
  if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  sourceUrl = null;
  el.picker.value = '';
  el.drop.classList.remove('has-image');
  el.preview.removeAttribute('src');
  el.previewBrowser.removeAttribute('src');
  el.previewSmall.removeAttribute('src');
  el.previewTouch.removeAttribute('src');
  el.miniPreview.removeAttribute('src');
  el.filename.textContent = '';
  el.dropTitle.textContent = 'Drop a square PNG here';
  el.dropDetails.textContent = 'or click to browse · PNG up to 10 MB';
  el.meta.textContent = 'No image selected';
  el.download.disabled = true;
  el.reset.hidden = true;
  announce('Choose a PNG to get started.');
}

async function acceptFile(file) {
  if (!file) return;
  if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
    announce('Please choose a PNG file.', true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    announce('PNG must be 10 MB or smaller.', true);
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    if (image.naturalWidth !== image.naturalHeight) throw new Error('Image must have a square aspect ratio.');
    if (image.naturalWidth < 16 || image.naturalWidth > 4096) throw new Error('Image size must be between 16px and 4096px.');
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = url;
    source = image;
    [el.preview, el.previewBrowser, el.previewSmall, el.previewTouch, el.miniPreview].forEach((item) => { item.src = url; });
    el.filename.textContent = file.name;
    el.dropTitle.textContent = 'Image loaded';
    el.dropDetails.textContent = 'Drop or choose another PNG to replace it';
    el.meta.textContent = `${image.naturalWidth} × ${image.naturalHeight} px · ${(file.size / 1024).toFixed(1)} KB`;
    el.drop.classList.add('has-image');
    el.reset.hidden = false;
    el.download.disabled = false;
    announce('Ready to export your favicon kit.');
  } catch (err) {
    URL.revokeObjectURL(url);
    announce(err.message || 'Unable to open this PNG.', true);
  }
}

function renderPng(size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas is unavailable.');
  ctx.imageSmoothingEnabled = currentMode !== 'pixel';
  if (ctx.imageSmoothingEnabled) ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(source, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error('Unable to encode a PNG.'));
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

function refreshSnippet() {
  el.snippet.textContent = htmlSnippet(el.theme.value);
}

async function downloadKit() {
  if (!source) return;
  el.download.disabled = true;
  el.download.textContent = 'Building kit…';
  announce('Rendering icons…');
  try {
    const sizes = [16, 32, 48, 180, 192, 512];
    const generated = await Promise.all(sizes.map(async (size) => [size, await renderPng(size)]));
    const bySize = new Map(generated);
    const ico = buildIco([16, 32, 48].map((size) => ({ size, bytes: bySize.get(size) })));
    const settings = {
      name: el.appName.value,
      shortName: el.shortName.value,
      themeColor: el.theme.value,
      backgroundColor: el.background.value
    };
    const entries = [
      { name: 'favicon.ico', data: ico },
      { name: 'favicon-16x16.png', data: bySize.get(16) },
      { name: 'favicon-32x32.png', data: bySize.get(32) },
      { name: 'favicon-48x48.png', data: bySize.get(48) },
      { name: 'apple-touch-icon.png', data: bySize.get(180) },
      { name: 'android-chrome-192x192.png', data: bySize.get(192) },
      { name: 'android-chrome-512x512.png', data: bySize.get(512) },
      { name: 'site.webmanifest', data: manifestJson(settings) },
      { name: 'HEAD_SNIPPET.html', data: htmlSnippet(settings.themeColor) },
      { name: 'README.txt', data: `FAVICON KIT — ${settings.name || 'My Website'}\n\n1. Extract all files into your site's public/ folder (or document root).\n2. Paste HEAD_SNIPPET.html into your page <head>.\n3. Reload with a hard refresh (browsers cache favicons aggressively)\n\nThe 16/32/48 images are packed inside favicon.ico.\nPNG images preserve transparency. The web manifest declares icons as 'any', not 'maskable'.\nA full installable PWA needs additional app configuration, this kit only provides icons and metadata.\nAll processing took place in your browser. No images were uploaded & no files left your computer.\n` }
    ];
    const zip = buildZip(entries);
    const link = document.createElement('a');
    const url = URL.createObjectURL(zip);
    link.href = url;
    link.download = `favicon-kit-${filenameSlug(settings.name)}.zip`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    announce(`Exported ${entries.length} files · ${(zip.size / 1024).toFixed(0)} KB ZIP`);
  } catch (error) {
    console.error(error);
    announce(`Export failed: ${error.message}`, true);
  } finally {
    el.download.disabled = false;
    el.download.textContent = 'Download favicon kit';
  }
}

el.picker.addEventListener('change', (event) => acceptFile(event.target.files?.[0]));
el.drop.addEventListener('dragover', (event) => { event.preventDefault(); el.drop.classList.add('dragging'); });
el.drop.addEventListener('dragleave', () => el.drop.classList.remove('dragging'));
el.drop.addEventListener('drop', (event) => {
  event.preventDefault();
  el.drop.classList.remove('dragging');
  acceptFile(event.dataTransfer?.files?.[0]);
});
el.reset.addEventListener('click', clearSource);
el.download.addEventListener('click', downloadKit);
el.theme.addEventListener('input', refreshSnippet);
el.appName.addEventListener('input', () => { el.browserTitle.textContent = el.appName.value.trim() || 'My Website'; });
for (const [control, mode] of [[el.pixel, 'pixel'], [el.smooth, 'smooth']]) {
  control.addEventListener('click', () => {
    currentMode = mode;
    el.pixel.setAttribute('aria-pressed', String(mode === 'pixel'));
    el.smooth.setAttribute('aria-pressed', String(mode === 'smooth'));
    applyPreview();
  });
}
el.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(el.snippet.textContent);
    announce('HTML snippet copied.');
  } catch {
    announce('Clipboard unavailable; select and copy the snippet.', true);
  }
});
applyPreview();
refreshSnippet();
clearSource();
