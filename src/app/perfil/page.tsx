import { ProfileAccountClient } from "@/components/profile/profile-account-client";
import { requirePathAccess } from "@/lib/auth/require";
import { PROFILE_AVATAR_BUCKET } from "@/lib/account/profile-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createStorageSignedUrl } from "@/lib/supabase/storage-url";

export default async function ProfilePage() {
  const session = await requirePathAccess("/perfil");
  if (!session) {
    return null;
  }

  let initialAvatarUrl: string | null = null;
  let sellerCode: number | null = null;

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("avatar_path, seller_code")
      .eq("id", session.userId)
      .maybeSingle();

    if (Number.isInteger(data?.seller_code) && Number(data?.seller_code) >= 1 && Number(data?.seller_code) <= 999) {
      sellerCode = Number(data?.seller_code);
    }

    if (data?.avatar_path) {
      initialAvatarUrl = await createStorageSignedUrl(
        supabase,
        PROFILE_AVATAR_BUCKET,
        data.avatar_path,
        { ownerId: session.userId },
      );
    }
  }

  return <ProfileAccountClient initialAvatarUrl={initialAvatarUrl} sellerCode={sellerCode} session={session} />;
}
