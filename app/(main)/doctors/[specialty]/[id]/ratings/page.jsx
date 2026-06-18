import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDoctorAverageRating, getDoctorRatings } from "@/actions/ratings";
import { DoctorRatingsClient } from "./_components/doctor-ratings-client";
import { loadDoctorProfile } from "@/lib/doctors/load-doctor-profile";
import { getLocalizedDoctor } from "@/lib/doctor-localized";
import { specialtyLabel } from "@/lib/specialty-i18n";
import { getServerI18n } from "@/lib/server-i18n";

export default async function DoctorRatingsPage({ params }) {
  const { id } = await params;
  const { doctor } = await loadDoctorProfile(id);

  if (!doctor) {
    redirect("/doctors");
  }

  const [avgRes, ratingsRes] = await Promise.all([
    getDoctorAverageRating(id),
    getDoctorRatings(id, null, 10),
  ]);

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "en";
  const dir = locale.toLowerCase().startsWith("ar") ? "rtl" : "ltr";
  const { dict } = await getServerI18n();
  const localized = getLocalizedDoctor(doctor, locale, (name) =>
    specialtyLabel(dict, name)
  );

  const initialAverage = avgRes?.success === true ? avgRes.average : 0;
  const initialTotal = avgRes?.success === true ? avgRes.total : 0;
  const initialRatings =
    ratingsRes?.success === true ? ratingsRes.ratings ?? [] : [];
  const initialNextCursor =
    ratingsRes?.success === true ? ratingsRes.nextCursor : null;
  const initialHasMore =
    ratingsRes?.success === true ? ratingsRes.hasMore : false;

  return (
    <DoctorRatingsClient
      dir={dir}
      doctorId={id}
      doctorName={localized.displayName}
      initialAverage={initialAverage}
      initialTotal={initialTotal}
      initialRatings={initialRatings}
      initialNextCursor={initialNextCursor}
      initialHasMore={initialHasMore}
    />
  );
}
