import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeInstagramHashtags, normalizeInstagramTemplate, publicationStatusCaption, selectPublicationAsset } from '../src/publication-processor.js';

test('automatic initial drafts select only Instagram-approved evidence attached to the report', () => {
  const reportId = 'report-1';
  const assets = [
    { media_id: 'update-photo', subject_type: 'community_update', subject_id: 'update-1' },
    { media_id: 'result-photo', subject_type: 'activity_result', subject_id: 'result-1' },
    { media_id: 'report-photo', subject_type: 'report', subject_id: reportId },
  ];
  const initialSources = [{ subject_type: 'report', subject_id: reportId }];

  assert.equal(selectPublicationAsset(assets.slice(0, 2), initialSources), undefined);
  assert.equal(selectPublicationAsset(assets, initialSources)?.media_id, 'report-photo');
});

test('resolution drafts continue to require the approved milestone evidence source', () => {
  const sources = [{ media_id: 'after-photo', subject_type: 'activity_result', subject_id: 'result-1' }];
  const assets = [
    { media_id: 'report-photo', subject_type: 'report', subject_id: 'report-1' },
    { media_id: 'after-photo', subject_type: 'activity_result', subject_id: 'result-1' },
  ];

  assert.equal(selectPublicationAsset(assets, sources)?.media_id, 'after-photo');
});

test('automatic captions preserve a canonical status link and refresh observation metadata without duplicate footer', async () => {
  const source = { occurredAt: '2026-10-05T00:00:00Z', area: { label: 'Kauman, Kota Malang' }, publicUrl: 'https://vergo.example/incidents/report-1' };
  const caption = publicationStatusCaption('Penanganan sebagian. Bukti terbaru.', source);
  assert.match(caption, /Penanganan sebagian/);
  assert.match(caption, /Laporan warga · bukti ditinjau moderator/);
  assert.match(caption, /Pengamatan: 5 Okt 2026 · Kauman, Kota Malang/);
  assert.ok(caption.endsWith(source.publicUrl));
  assert.equal(publicationStatusCaption(caption, source), caption);
});

test('new automatic copy replaces legacy branding and keeps only the configured canonical status link', () => {
  const source = { occurredAt: '2026-10-05T00:00:00Z', area: { label: 'Kauman, Kota Malang' }, publicUrl: 'https://vergo.example/incidents/report-1' };
  const stale = 'Pantau perkembangan di SAP: https://sap.venlab.tech/incidents/old\n#SAP #Lingkungan';
  const caption = publicationStatusCaption(stale, source);
  assert.doesNotMatch(caption, /\bSAP\b|sap\.venlab\.tech/i);
  assert.match(caption, /#VERGO #Lingkungan/);
  assert.equal(caption.split(source.publicUrl).length - 1, 1);
  assert.equal(normalizeInstagramTemplate('{summary} Pantau di SAP: {url}'), '{summary} Pantau di VERGO: {url}');
  assert.equal(normalizeInstagramHashtags('#SAP #Lingkungan'), '#VERGO #Lingkungan');
});
