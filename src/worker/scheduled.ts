import { runAttendanceScheduler } from "@/modules/sessions/service";

export async function handleScheduledAttendance(
  controller: ScheduledController,
  env: CloudflareEnv,
): Promise<void> {
  const startedAt = Date.now();

  try {
    const result = await runAttendanceScheduler(
      env.DB,
      controller.scheduledTime,
    );
    console.info("attendance_scheduler_completed", {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      durationMs: Date.now() - startedAt,
      ...result,
    });
  } catch (error) {
    console.error("attendance_scheduler_failed", {
      cron: controller.cron,
      scheduledTime: controller.scheduledTime,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });
    throw error;
  }
}
