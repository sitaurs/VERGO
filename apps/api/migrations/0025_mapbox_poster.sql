-- The poster basemap/provider changed; editable renditions need a new preview.
ALTER TABLE instagram_posts ALTER COLUMN template_version SET DEFAULT 'vergo-feed-status-v6';

UPDATE instagram_posts
SET approval = jsonb_build_object(
      'status', 'invalidated',
      'contentRevision', NULL,
      'sourceRevision', NULL,
      'renditionId', NULL,
      'approvedAt', NULL),
    revision = revision + 1,
    updated_at = now()
WHERE template_version <> 'vergo-feed-status-v6'
  AND status IN ('draft', 'failed')
  AND approval->>'status' = 'approved';
