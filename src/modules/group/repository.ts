import { eq } from "drizzle-orm";

import { createDatabase } from "@/db/client";
import { groupSettings } from "@/db/schema";

import type { GroupSettingsDto, GroupSettingsInput } from "./schema";
import { normalizeClockTime } from "./schema";

type GroupRow = typeof groupSettings.$inferSelect;

export async function findActiveGroup(
  binding: D1Database,
): Promise<GroupSettingsDto | null> {
  const database = createDatabase(binding);
  const row = await database.query.groupSettings.findFirst({
    where: eq(groupSettings.isActive, true),
  });

  return row ? toGroupDto(row) : null;
}

export async function updateActiveGroup(
  binding: D1Database,
  actorUserId: string,
  current: GroupSettingsDto,
  input: GroupSettingsInput,
): Promise<GroupSettingsDto> {
  const now = Date.now();
  const startTime = normalizeClockTime(input.dailyPolicy.startTime);
  const endTime = normalizeClockTime(input.dailyPolicy.endTime);
  const lateTime = input.dailyPolicy.lateTime;
  const [updated] = await binding.batch([
    binding
      .prepare(
        `UPDATE group_settings
         SET name = ?, village = ?, district = ?, regency = ?, address = ?,
             period_start = ?, period_end = ?, daily_auto_create = ?,
             daily_start_time = ?, daily_end_time = ?, daily_late_time = ?,
             daily_default_mode = ?, updated_at = ?, updated_by = ?
         WHERE id = ? AND is_active = 1`,
      )
      .bind(
        input.name,
        input.village,
        input.district,
        input.regency,
        input.address,
        input.periodStart,
        input.periodEnd,
        input.dailyPolicy.autoCreate ? 1 : 0,
        startTime,
        endTime,
        lateTime,
        input.dailyPolicy.defaultMode,
        now,
        actorUserId,
        current.id,
      ),
    binding
      .prepare(
        `INSERT INTO audit_logs
         (id, action, entity_type, entity_id, metadata, created_at, created_by)
         SELECT ?, 'GROUP_SETTINGS_UPDATED', 'group_settings', ?, ?, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM group_settings
           WHERE id = ? AND updated_at = ? AND updated_by = ?
         )`,
      )
      .bind(
        crypto.randomUUID(),
        current.id,
        JSON.stringify({
          changedFields: ["identity", "period", "dailyPolicy"],
        }),
        now,
        actorUserId,
        current.id,
        now,
        actorUserId,
      ),
  ]);

  if ((updated.meta.changes ?? 0) !== 1) {
    throw new Error("GROUP_UPDATE_NOT_APPLIED");
  }

  return {
    ...current,
    name: input.name,
    village: input.village,
    district: input.district,
    regency: input.regency,
    address: input.address,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dailyPolicy: {
      autoCreate: input.dailyPolicy.autoCreate,
      startTime,
      endTime,
      lateTime,
      defaultMode: input.dailyPolicy.defaultMode,
    },
    updatedAt: now,
  };
}

function toGroupDto(row: GroupRow): GroupSettingsDto {
  return {
    id: row.id,
    name: row.name,
    village: row.village,
    district: row.district,
    regency: row.regency,
    address: row.address,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    timezone: "Asia/Jakarta",
    dailyPolicy: {
      autoCreate: row.dailyAutoCreate,
      startTime: row.dailyStartTime,
      endTime: row.dailyEndTime,
      lateTime: row.dailyLateTime,
      defaultMode:
        row.dailyDefaultMode as GroupSettingsDto["dailyPolicy"]["defaultMode"],
    },
    updatedAt: row.updatedAt.getTime(),
  };
}
