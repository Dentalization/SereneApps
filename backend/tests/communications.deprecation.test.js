import test from 'node:test';
import assert from 'node:assert/strict';
import { deprecatedVideoTokenHeaders } from '../src/routes/communications.js';

test('deprecated video token route declares successor and sunset metadata', () => {
  const headers = deprecatedVideoTokenHeaders();

  assert.equal(headers.Deprecation, 'true');
  assert.match(headers.Sunset, /31 Jul 2026/);
  assert.match(headers.Link, /\/communications\/appointments\/:appointmentId\/token/);
  assert.match(headers.Link, /successor-version/);
});
