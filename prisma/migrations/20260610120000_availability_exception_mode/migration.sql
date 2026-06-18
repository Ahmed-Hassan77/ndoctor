-- Scope blocked periods to online vs in-person, and optionally to a clinic branch.
ALTER TABLE "AvailabilityException" ADD COLUMN "appointmentMode" "AppointmentMode";
