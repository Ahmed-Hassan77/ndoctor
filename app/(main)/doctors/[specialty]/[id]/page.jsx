import { getDoctorRatings } from "@/actions/ratings";
import { isDoctorFavorited } from "@/actions/favorites";
import { checkUser } from "@/lib/checkUser";
import { DoctorProfile } from "./_components/doctor-profile";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loadDoctorProfile } from "@/lib/doctors/load-doctor-profile";

export default async function DoctorProfilePage({ params }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "en";
  const dir = locale.toLowerCase().startsWith("ar") ? "rtl" : "ltr";

  const { doctor } = await loadDoctorProfile(id);

  if (!doctor) {
    redirect("/doctors");
  }

  const ratingsRes = await getDoctorRatings(id, null, 3);
  const reviewPreview =
    ratingsRes?.success === true ? ratingsRes.ratings ?? [] : [];

  const user = await checkUser();
  const showFavorite = user?.role === "PATIENT";
  let initialFavorited = false;
  if (showFavorite) {
    const favRes = await isDoctorFavorited(id);
    if (favRes?.success) initialFavorited = favRes.favorited;
  }

  return (
    <DoctorProfile
      doctor={doctor}
      reviewPreview={reviewPreview}
      dir={dir}
      showFavorite={showFavorite}
      initialFavorited={initialFavorited}
    />
  );
}
