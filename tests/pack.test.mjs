import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIco, buildZip, crc32, manifestJson, htmlSnippet, filenameSlug } from '../lib/pack.js';

const text = new TextEncoder();

test('CRC32 matches known input', () => {
  assert.equal(crc32(text.encode('123456789')), 0xcbf43926);
});

test('ICO stores three PNG frames with valid offsets', () => {
  const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
  const sizes = [16, 32, 48];
  const ico = buildIco(sizes.map(size => ({ size, bytes: png })));
  const view = new DataView(ico.buffer);
  assert.equal(view.getUint16(2, true), 1);
  assert.equal(view.getUint16(4, true), 3);
  sizes.forEach((size, i) => {
    const base = 6 + 16 * i;
    assert.equal(ico[base], size);
    const offset = view.getUint32(base + 12, true);
    assert.deepEqual(Array.from(ico.slice(offset, offset + png.length)), Array.from(png));
  });
});

test('ZIP wraps files and records central directory', async () => {
  const zip = buildZip([
    { name: 'README.txt', data: 'hello' },
    { name: 'nested/ok.txt', data: text.encode('there') }
  ]);
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), 2);
});

test('manifest contains correctly sized PNG icons and no false maskable claim', () => {
  const manifest = JSON.parse(manifestJson({ name: 'My Test', shortName: '', themeColor: '#123456', backgroundColor: '#ffffff' }));
  assert.equal(manifest.name, 'My Test');
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512']);
  assert.deepEqual(manifest.icons.map(icon => icon.purpose), ['any', 'any']);
  assert.equal(manifest.theme_color, '#123456');
});

test('HTML tag paths and filename slugs', () => {
  assert.match(htmlSnippet('#abcdef'), /site\.webmanifest/);
  assert.equal(filenameSlug('A Cool App!'), 'a-cool-app');
  assert.equal(filenameSlug(''), 'website');
});
