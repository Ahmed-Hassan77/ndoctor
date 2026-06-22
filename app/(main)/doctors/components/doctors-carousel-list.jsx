"use client";

import { DoctorsCarousel } from "@/components/doctors/doctors-carousel";
import { DoctorCard } from "@/app/(main)/doctors/components/doctor-card";

/**
 * Client wrapper for doctor results carousel (presentation only).
 * @param {{ doctors: object[]; showFavorite?: boolean; favoriteDoctorIds?: string[] }} props
 */
export function DoctorsCarouselList({
  doctors,
  showFavorite = false,
  favoriteDoctorIds = [],
}) {
  const favoriteSet = new Set(favoriteDoctorIds);

  return (
    <DoctorsCarousel className="px-1 sm:px-6 md:px-10">
      {doctors.map((doctor) => (
        <DoctorCard
          key={doctor.id}
          doctor={doctor}
          variant="carousel"
          showFavorite={showFavorite}
          initialFavorited={
            showFavorite ? favoriteSet.has(doctor.id) : undefined
          }
        />
      ))}
    </DoctorsCarousel>
  );
}
