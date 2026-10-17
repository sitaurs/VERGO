-- Reporter assertions are private, not verification findings. Legacy sources stay
-- NULL because historical reports did not collect this attestation.
ALTER TABLE reports
  ADD COLUMN observation_source text CHECK (observation_source IN ('firsthand', 'secondhand')),
  ADD COLUMN inference text CHECK (inference IS NULL OR char_length(inference) BETWEEN 1 AND 1000),
  ADD COLUMN source_reference text CHECK (source_reference IS NULL OR char_length(source_reference) BETWEEN 1 AND 1000),
  ADD COLUMN context_flags text[] NOT NULL DEFAULT '{}' CHECK (
    context_flags <@ ARRAY['burning', 'near_waterway', 'sharp_objects']::text[]
    AND cardinality(context_flags) <= 3
  ),
  ADD COLUMN photo_unavailable_reason text CHECK (photo_unavailable_reason IN ('unsafe')),
  ADD CONSTRAINT reports_source_reference_secondhand CHECK (
    source_reference IS NULL OR observation_source IS NOT DISTINCT FROM 'secondhand'
  );

COMMENT ON COLUMN reports.observation_source IS 'Private reporter attestation; NULL is legacy/unknown, never assumed firsthand.';
COMMENT ON COLUMN reports.context_flags IS 'Private observable context asserted by reporter; not AI diagnosis or verified risk.';
COMMENT ON COLUMN reports.photo_unavailable_reason IS 'Unsafe photo exception: submitted/private until photo evidence is supplied and moderator reviews.';
