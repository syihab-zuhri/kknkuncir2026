CREATE TABLE `attendance_audits` (
	`id` text PRIMARY KEY NOT NULL,
	`attendance_id` text NOT NULL,
	`action` text NOT NULL,
	`old_values` text,
	`new_values` text NOT NULL,
	`reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`attendance_id`) REFERENCES `attendance_records`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_attendance_audits_action" CHECK("attendance_audits"."action" IN ('CREATE', 'MANUAL_CREATE', 'STATUS_CHANGE')),
	CONSTRAINT "ck_attendance_audits_reason" CHECK("attendance_audits"."action" = 'CREATE' OR ("attendance_audits"."reason" IS NOT NULL AND length(trim("attendance_audits"."reason")) > 0))
);
--> statement-breakpoint
CREATE INDEX `ix_audits_attendance_created` ON `attendance_audits` (`attendance_id`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`method` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`location_status` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`accuracy_meters` real,
	`location_captured_at` integer,
	`idempotency_key` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_attendance_records_status" CHECK("attendance_records"."status" IN ('PRESENT', 'LATE', 'SICK', 'PERMITTED', 'ABSENT')),
	CONSTRAINT "ck_attendance_records_method" CHECK("attendance_records"."method" IN ('SELF_SCAN', 'ADMIN_SCAN', 'MANUAL')),
	CONSTRAINT "ck_attendance_records_location_status" CHECK("attendance_records"."location_status" IN ('CAPTURED', 'NOT_REQUIRED', 'UNAVAILABLE')),
	CONSTRAINT "ck_attendance_records_revision" CHECK("attendance_records"."revision" >= 1),
	CONSTRAINT "ck_attendance_records_latitude" CHECK("attendance_records"."latitude" IS NULL OR "attendance_records"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "ck_attendance_records_longitude" CHECK("attendance_records"."longitude" IS NULL OR "attendance_records"."longitude" BETWEEN -180 AND 180),
	CONSTRAINT "ck_attendance_records_accuracy" CHECK("attendance_records"."accuracy_meters" IS NULL OR "attendance_records"."accuracy_meters" >= 0),
	CONSTRAINT "ck_attendance_records_location_payload" CHECK(("attendance_records"."location_status" = 'CAPTURED' AND "attendance_records"."latitude" IS NOT NULL AND "attendance_records"."longitude" IS NOT NULL AND "attendance_records"."location_captured_at" IS NOT NULL) OR ("attendance_records"."location_status" != 'CAPTURED' AND "attendance_records"."latitude" IS NULL AND "attendance_records"."longitude" IS NULL AND "attendance_records"."accuracy_meters" IS NULL AND "attendance_records"."location_captured_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_attendance_session_student` ON `attendance_records` (`session_id`,`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_attendance_idempotency` ON `attendance_records` (`idempotency_key`) WHERE "attendance_records"."idempotency_key" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `ix_records_student_recorded` ON `attendance_records` (`student_id`,"recorded_at" desc);--> statement-breakpoint
CREATE INDEX `ix_records_session_status` ON `attendance_records` (`session_id`,`status`);--> statement-breakpoint
CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_type` text NOT NULL,
	`title` text NOT NULL,
	`session_date` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`late_after` integer,
	`attendance_mode` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`notes` text,
	`qr_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_attendance_sessions_type" CHECK("attendance_sessions"."session_type" IN ('DAILY', 'EVENT')),
	CONSTRAINT "ck_attendance_sessions_mode" CHECK("attendance_sessions"."attendance_mode" IN ('SELF_SCAN', 'ADMIN_SCAN', 'HYBRID')),
	CONSTRAINT "ck_attendance_sessions_status" CHECK("attendance_sessions"."status" IN ('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED')),
	CONSTRAINT "ck_attendance_sessions_time" CHECK("attendance_sessions"."ends_at" > "attendance_sessions"."starts_at"),
	CONSTRAINT "ck_attendance_sessions_late" CHECK("attendance_sessions"."late_after" IS NULL OR ("attendance_sessions"."late_after" >= "attendance_sessions"."starts_at" AND "attendance_sessions"."late_after" <= "attendance_sessions"."ends_at")),
	CONSTRAINT "ck_attendance_sessions_title" CHECK(length("attendance_sessions"."title") BETWEEN 1 AND 120),
	CONSTRAINT "ck_attendance_sessions_qr_version" CHECK("attendance_sessions"."qr_version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_daily_session_date` ON `attendance_sessions` (`session_date`) WHERE "attendance_sessions"."session_type" = 'DAILY' AND "attendance_sessions"."status" != 'CANCELLED';--> statement-breakpoint
CREATE INDEX `ix_sessions_date_status` ON `attendance_sessions` (`session_date`,`status`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_audit_logs_entity_created` ON `audit_logs` (`entity_type`,`entity_id`,"created_at" desc);--> statement-breakpoint
CREATE INDEX `ix_audit_logs_actor_created` ON `audit_logs` (`created_by`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `group_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'KKN Desa Kuncir 2026' NOT NULL,
	`village` text,
	`district` text,
	`regency` text,
	`address` text,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`timezone` text DEFAULT 'Asia/Jakarta' NOT NULL,
	`daily_auto_create` integer DEFAULT false NOT NULL,
	`daily_start_time` text NOT NULL,
	`daily_end_time` text NOT NULL,
	`daily_late_time` text,
	`daily_default_mode` text DEFAULT 'SELF_SCAN' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_group_settings_period" CHECK("group_settings"."period_end" >= "group_settings"."period_start"),
	CONSTRAINT "ck_group_settings_default_mode" CHECK("group_settings"."daily_default_mode" IN ('SELF_SCAN', 'ADMIN_SCAN', 'HYBRID'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_group_settings_single_active` ON `group_settings` (`is_active`) WHERE "group_settings"."is_active" = 1;--> statement-breakpoint
CREATE TABLE `qr_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`rotated_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_qr_credentials_version" CHECK("qr_credentials"."version" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_qr_credentials_token_hash` ON `qr_credentials` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_qr_credentials_student_active` ON `qr_credentials` (`student_id`) WHERE "qr_credentials"."is_active" = 1;--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`group_id` text NOT NULL,
	`nim` text NOT NULL,
	`phone` text,
	`notes` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`group_id`) REFERENCES `group_settings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_students_user_id` ON `students` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_students_nim_active` ON `students` (`nim`) WHERE "students"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `ix_students_group_id` ON `students` (`group_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`username` text,
	`display_username` text,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	CONSTRAINT "ck_user_role" CHECK("user"."role" IN ('ADMIN', 'STUDENT'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);