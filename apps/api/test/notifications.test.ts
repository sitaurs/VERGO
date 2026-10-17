import assert from 'node:assert/strict';
import test from 'node:test';
import { ImpactService, notificationCopy } from '../src/activities/impact.service.js';

const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

test('legacy notification copy uses VERGO naming and host', () => {
  assert.equal(notificationCopy('Buka SAP di sap.venlab.tech atau ikuti #SAP.'),
    'Buka VERGO di vergo.venlab.tech atau ikuti #VERGO.');
});

test('legacy evidence notification resolves its report from the owner-matched audit event', async () => {
  const statements: string[] = [];
  const db = async (parts: TemplateStringsArray, ..._values: unknown[]) => {
    const sql = parts.join('?');
    statements.push(sql);
    return [{ target_id: REPORT_ID }];
  };
  const service = new ImpactService({ db } as never, {} as never);
  const dto = await (service as unknown as {
    notificationDto: (row: Record<string, unknown>) => Promise<{ targetPath: string; message: string }>;
  }).notificationDto({
    id: '44444444-4444-4444-8444-444444444444',
    user_id: USER_ID,
    event_key: `evidence-request:${ADMIN_ID}:55555555-5555-4555-8555-555555555555`,
    type: 'evidence_requested',
    title: 'Admin meminta klarifikasi',
    message: 'Buka SAP untuk melihat informasi terbaru.',
    target_path: '/dashboard?view=reports',
    read: false,
    created_at: new Date('2026-10-17T07:00:00.000Z'),
  });

  assert.equal(dto.targetPath, `/dashboard?view=reports&report=${REPORT_ID}`);
  assert.equal(dto.message, 'Buka VERGO untuk melihat informasi terbaru.');
  assert.match(statements[0]!, /audit_events/);
  assert.match(statements[0]!, /r\.reporter_id/);
});

test('legacy report status notification opens its matching report only for its reporter', async () => {
  const db = async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const sql = parts.join('?');
    if (sql.includes('FROM reports')) return values[0] === REPORT_ID && values[1] === USER_ID ? [{ id: REPORT_ID }] : [];
    return [];
  };
  const service = new ImpactService({ db } as never, {} as never);
  const resolve = (userId: string) => (service as unknown as {
    notificationDto: (row: Record<string, unknown>) => Promise<{ targetPath: string }>;
  }).notificationDto({
    id: '44444444-4444-4444-8444-444444444444', user_id: userId,
    event_key: `report-reporter:${REPORT_ID}:4`, type: 'incident_updated', title: 'Status berubah',
    message: 'Status laporan berubah.', target_path: '/dashboard?view=reports', read: false,
    created_at: new Date('2026-10-17T07:00:00.000Z'),
  });

  assert.equal((await resolve(USER_ID)).targetPath, `/dashboard?view=reports&report=${REPORT_ID}`);
  assert.equal((await resolve(ADMIN_ID)).targetPath, '/dashboard?view=reports');
});

test('legacy community update notification opens the parent report for its author', async () => {
  const updateId = '55555555-5555-4555-8555-555555555555';
  const db = async (parts: TemplateStringsArray, ..._values: unknown[]) => {
    if (parts.join('?').includes('FROM community_updates')) return [{ report_id: REPORT_ID }];
    return [];
  };
  const service = new ImpactService({ db } as never, {} as never);
  const dto = await (service as unknown as {
    notificationDto: (row: Record<string, unknown>) => Promise<{ targetPath: string }>;
  }).notificationDto({
    id: '66666666-6666-4666-8666-666666666666', user_id: USER_ID,
    event_key: `update:${updateId}:2`, type: 'community_update_decided', title: 'Pembaruan diproses',
    message: 'Buka pembaruan.', target_path: `/community-updates/${updateId}`, read: false,
    created_at: new Date('2026-10-17T07:00:00.000Z'),
  });

  assert.equal(dto.targetPath, `/dashboard?view=reports&report=${REPORT_ID}`);
});
