import type { Metadata } from "next";

import { AdminFrame } from "@/components/admin/admin-frame";
import { GroupSettingsForm } from "@/components/admin/group-settings-form";
import { requirePageSession } from "@/lib/auth/page-guards";
import { getAppEnv } from "@/lib/cloudflare-env";
import { getActiveGroup } from "@/modules/group/service";

export const metadata: Metadata = { title: "Pengaturan Kelompok" };

export default async function GroupSettingsPage() {
  const session = await requirePageSession(["ADMIN"]);
  const group = await getActiveGroup(getAppEnv().DB);

  return (
    <AdminFrame
      active="group"
      actorName={session.user.name}
      description="Satu sumber kebenaran untuk identitas KKN dan kebijakan kehadiran harian."
      title="Kelompok tunggal, aturan jelas"
    >
      <GroupSettingsForm initialGroup={group} />
    </AdminFrame>
  );
}
