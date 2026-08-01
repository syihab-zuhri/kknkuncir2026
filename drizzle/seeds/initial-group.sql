-- Idempotent operational seed. It intentionally runs after the first Admin exists.
-- The broad 2026 period is safe because daily_auto_create remains disabled until
-- an Admin reviews the real KKN dates and schedule in Phase 2.
INSERT INTO group_settings (
  id,
  name,
  village,
  district,
  regency,
  address,
  period_start,
  period_end,
  timezone,
  daily_auto_create,
  daily_start_time,
  daily_end_time,
  daily_late_time,
  daily_default_mode,
  is_active,
  created_at,
  updated_at,
  created_by,
  updated_by
)
SELECT
  'kkn-desa-kuncir-2026',
  'KKN Desa Kuncir 2026',
  'Kuncir',
  NULL,
  NULL,
  NULL,
  '2026-01-01',
  '2026-12-31',
  'Asia/Jakarta',
  0,
  '07:00:00',
  '17:00:00',
  '07:15:00',
  'SELF_SCAN',
  1,
  cast(unixepoch('subsecond') * 1000 as integer),
  cast(unixepoch('subsecond') * 1000 as integer),
  u.id,
  u.id
FROM user u
WHERE u.role = 'ADMIN'
  AND u.is_active = 1
  AND NOT EXISTS (
    SELECT 1 FROM group_settings WHERE is_active = 1
  )
ORDER BY u.created_at
LIMIT 1;

INSERT INTO audit_logs (
  id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at,
  created_by
)
SELECT
  lower(hex(randomblob(16))),
  'GROUP_SEEDED',
  'group_settings',
  g.id,
  '{"dailyAutoCreate":false,"periodRequiresReview":true}',
  cast(unixepoch('subsecond') * 1000 as integer),
  g.created_by
FROM group_settings g
WHERE g.id = 'kkn-desa-kuncir-2026'
  AND NOT EXISTS (
    SELECT 1 FROM audit_logs
    WHERE action = 'GROUP_SEEDED'
      AND entity_type = 'group_settings'
      AND entity_id = g.id
  );
