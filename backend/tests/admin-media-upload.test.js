import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-media-upload-tests';

const { dispatch } = await import('../src/index.js');

function upload(file) {
  return dispatch({
    method: 'POST',
    path: '/admin/media/upload',
    user: { role: 'ADMIN', id: 'media-upload-test-admin' },
    body: { files: file ? [file] : [] }
  });
}

function encodedFile(name, type, bytes) {
  return { name, type, data: `data:${type};base64,${bytes.toString('base64')}` };
}

test('media upload accepts a small JPG', async () => {
  const response = await upload(encodedFile('small.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xd9])));
  assert.equal(response.status, 201);
  assert.equal(response.body[0].mimeType, 'image/jpeg');
  assert.equal(response.body[0].slug, 'small.jpg');
});

test('media upload accepts WebP', async () => {
  const response = await upload(encodedFile('small.webp', 'image/webp', Buffer.from('RIFF0000WEBP')));
  assert.equal(response.status, 201);
  assert.equal(response.body[0].mimeType, 'image/webp');
  assert.equal(response.body[0].slug, 'small.webp');
});

test('media upload returns 413 with a size-specific message over the image limit', async () => {
  const bytes = Buffer.alloc(8 * 1024 * 1024 + 1);
  const response = await upload(encodedFile('large.jpg', 'image/jpeg', bytes));
  assert.equal(response.status, 413);
  assert.equal(response.body.message, 'File too large. Each image must be 8 MB or smaller.');
});

test('media upload returns a specific 400 for unsupported formats', async () => {
  const response = await upload(encodedFile('unsupported.avif', 'image/avif', Buffer.from('image')));
  assert.equal(response.status, 400);
  assert.match(response.body.message, /Unsupported format\. Use JPG\/PNG\/WebP/);
});

test('media upload returns a specific 400 when no file is provided', async () => {
  const response = await upload(null);
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'No file provided. Choose a file to upload.');
});

test('media upload returns a specific 400 for an empty file', async () => {
  const response = await upload(encodedFile('empty.jpg', 'image/jpeg', Buffer.alloc(0)));
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Uploaded file is empty.');
});
