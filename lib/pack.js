// Minimal dependency-free binary helpers. Both formats are supported by modern browsers.
const encoder = new TextEncoder();

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

export function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function buildIco(images) {
  // ICO entries may contain PNG-encoded images (supported since Windows Vista).
  // All entries must be square, no larger than 256×256.
  if (!images.length) throw new Error('ICO needs at least one image');
  const headerLength = 6 + images.length * 16;
  const length = headerLength + images.reduce((total, image) => total + image.bytes.length, 0);
  const out = new Uint8Array(length);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = headerLength;
  images.forEach(({ size, bytes }, i) => {
    if (size < 1 || size > 256) throw new Error(`Unsupported ICO size ${size}`);
    const p = 6 + i * 16;
    out[p] = size === 256 ? 0 : size;
    out[p + 1] = size === 256 ? 0 : size;
    out[p + 2] = 0;
    out[p + 3] = 0;
    view.setUint16(p + 4, 1, true);
    view.setUint16(p + 6, 32, true);
    view.setUint32(p + 8, bytes.length, true);
    view.setUint32(p + 12, offset, true);
    out.set(bytes, offset);
    offset += bytes.length;
  });
  return out;
}

function dosDateTime(date) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

export function buildZip(entries) {
  // ZIP store (no compression): small PNGs are already compressed. No dependencies.
  const locals = [];
  const centrals = [];
  let offset = 0;
  const { time, date } = dosDateTime(new Date());
  for (const { name, data } of entries) {
    if (!name || name.includes('..') || name.startsWith('/')) throw new Error('Invalid archive filename');
    const nameBytes = encoder.encode(name);
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    if (!(bytes instanceof Uint8Array)) throw new Error(`Invalid data for ${name}`);
    const checksum = crc32(bytes);
    const local = new Uint8Array(30 + nameBytes.length + bytes.length);
    const v = new DataView(local.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x0800, true); // UTF-8 paths
    v.setUint16(8, 0, true); // stored
    v.setUint16(10, time, true);
    v.setUint16(12, date, true);
    v.setUint32(14, checksum, true);
    v.setUint32(18, bytes.length, true);
    v.setUint32(22, bytes.length, true);
    v.setUint16(26, nameBytes.length, true);
    v.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(bytes, 30 + nameBytes.length);
    locals.push(local);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, checksum, true);
    cv.setUint32(20, bytes.length, true);
    cv.setUint32(24, bytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }
  const centralLength = centrals.reduce((n, bytes) => n + bytes.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralLength, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  return new Blob([...locals, ...centrals, end], { type: 'application/zip' });
}

export function manifestJson({ name, shortName, themeColor, backgroundColor }) {
  return JSON.stringify({
    name: name.trim() || 'My Website',
    short_name: shortName.trim() || (name.trim() || 'My Website').slice(0, 24),
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ],
    theme_color: themeColor,
    background_color: backgroundColor,
    display: 'standalone',
    start_url: '/'
  }, null, 2) + '\n';
}

export function htmlSnippet(themeColor) {
  return `<!-- Generated by Favicon Kit. Place files in your site's public root. -->\n<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">\n<meta name="theme-color" content="${themeColor}">\n`;
}

export function filenameSlug(value) {
  return (value || 'website').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'website';
}
