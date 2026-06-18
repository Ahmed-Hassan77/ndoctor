import { HomePage } from "@/components/home/home-page";
import { searchDoctors } from "@/actions/doctors-listing";
import { DB_UNAVAILABLE } from "@/lib/db-safe";

export default async function Home() {
  const result = await searchDoctors({ sort: "rating" });
  const dbError =
    result.error === DB_UNAVAILABLE ? DB_UNAVAILABLE : null;

  return (
    <HomePage
      featuredDoctors={(result.doctors ?? []).slice(0, 4)}
      dbError={dbError}
    />
  );
}
