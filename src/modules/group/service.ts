import { GroupServiceError } from "./errors";
import { findActiveGroup, updateActiveGroup } from "./repository";
import { groupSettingsInputSchema, type GroupSettingsDto } from "./schema";

export async function getActiveGroup(
  binding: D1Database,
): Promise<GroupSettingsDto> {
  const group = await findActiveGroup(binding);

  if (!group) {
    throw new GroupServiceError(
      404,
      "GROUP_NOT_FOUND",
      "Konfigurasi kelompok belum dibuat.",
    );
  }

  return group;
}

export async function updateGroupSettings(
  binding: D1Database,
  actorUserId: string,
  payload: unknown,
): Promise<GroupSettingsDto> {
  const input = groupSettingsInputSchema.parse(payload);
  const current = await getActiveGroup(binding);

  try {
    return await updateActiveGroup(binding, actorUserId, current, input);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GROUP_UPDATE_NOT_APPLIED"
    ) {
      throw new GroupServiceError(
        409,
        "GROUP_UPDATE_CONFLICT",
        "Konfigurasi kelompok berubah. Muat ulang lalu coba lagi.",
      );
    }
    throw error;
  }
}
