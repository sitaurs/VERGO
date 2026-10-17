import assert from 'node:assert/strict';
import test from 'node:test';
import { isSyntheticQaDescription } from '../src/reports/synthetic-qa.js';

test('explicit leading QA markers identify synthetic report descriptions', () => {
  for (const value of [
    'QA TEST ronde6: simulasi',
    '  qa test only. bukan kejadian nyata',
    '[DATA UJI QA] lokasi contoh',
    '[ data uji qa ] foto sintetis',
  ]) assert.equal(isSyntheticQaDescription(value), true, value);

  for (const value of [
    'Sampah ditemukan dekat taman.',
    'Masyarakat meminta QA TEST diadakan untuk relawan.',
    '[QA] catatan pemeriksaan',
    null,
  ]) assert.equal(isSyntheticQaDescription(value), false, String(value));
});
