-- Instagram drafts need a fresh, VERGO-branded rendition and review after the
-- SAP-era template. Keep old rendition versions intact so the UI can identify
-- them and require an explicit save/new preview.
ALTER TABLE instagram_posts ALTER COLUMN template_version SET DEFAULT 'vergo-feed-status-v5';

UPDATE instagram_settings
SET revision = revision + 1,
    payload = jsonb_set(
      jsonb_set(
        payload,
        '{captionTemplate}',
        to_jsonb(regexp_replace(
          regexp_replace(COALESCE(payload->>'captionTemplate', ''),
            'https?://(www\.)?sap\.venlab\.tech[^[:space:]]*', '{url}', 'gi'),
          '\mSAP\M', 'VERGO', 'gi')),
        true),
      '{hashtags}',
      to_jsonb(regexp_replace(COALESCE(payload->>'hashtags', ''), '#SAP\M', '#VERGO', 'gi')),
      true),
    updated_at = now()
WHERE singleton = true AND payload::text ~* 'sap';

-- Stale editable drafts are not approved for their upcoming replacement image.
UPDATE instagram_posts
SET approval = jsonb_build_object(
      'status', 'invalidated',
      'contentRevision', NULL,
      'sourceRevision', NULL,
      'renditionId', NULL,
      'approvedAt', NULL),
    revision = revision + 1,
    updated_at = now()
WHERE template_version <> 'vergo-feed-status-v5'
  AND status IN ('draft', 'failed')
  AND approval->>'status' = 'approved';
