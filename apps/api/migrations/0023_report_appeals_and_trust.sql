CREATE TABLE report_appeals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
 appellant_id uuid REFERENCES users(id) ON DELETE SET NULL,
 source_revision integer NOT NULL CHECK(source_revision > 0),
 reason text NOT NULL CHECK(char_length(reason) BETWEEN 20 AND 2000),
 media_ids uuid[] NOT NULL DEFAULT '{}' CHECK(cardinality(media_ids) <= 3),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','needs_evidence','accepted','rejected')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 decision_reason text, decided_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX report_appeals_one_open ON report_appeals(report_id,appellant_id)
 WHERE status IN ('pending','needs_evidence');
CREATE INDEX report_appeals_queue ON report_appeals(status,created_at DESC,id DESC);
CREATE INDEX report_appeals_owner ON report_appeals(appellant_id,created_at DESC);

CREATE TABLE trust_settings (
 id text PRIMARY KEY DEFAULT 'singleton' CHECK(id='singleton'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 operator_label text CHECK(char_length(operator_label) BETWEEN 1 AND 100),
 contact_url text CHECK(char_length(contact_url) BETWEEN 1 AND 500),
 review_notice text CHECK(char_length(review_notice) BETWEEN 1 AND 1000),
 retention_notice text CHECK(char_length(retention_notice) BETWEEN 1 AND 1000),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO trust_settings(id) VALUES('singleton');
