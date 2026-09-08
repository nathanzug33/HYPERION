"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/guards";
import { disconnectGoogle } from "@/lib/google-oauth";

export async function disconnectGoogleAction() {
  const session = await requireSession();
  await disconnectGoogle(session.user.id);
  revalidatePath("/admin/profil");
}
