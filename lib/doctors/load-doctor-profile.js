import { cache } from "react";
import { getDoctorById } from "@/actions/appointments";

/** Deduplicate doctor profile fetches within a single request (layout + page + metadata). */
export const loadDoctorProfile = cache(async (doctorId) => {
  return getDoctorById(doctorId);
});
