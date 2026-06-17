import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFirstTenantSlug } from "@/lib/auth-actions";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const slug = await getFirstTenantSlug(user.id);

  if (slug) {
    redirect(`/${slug}/dashboard`);
  }

  // Authenticated but no tenant yet (edge case — incomplete registration)
  redirect("/register");
}
