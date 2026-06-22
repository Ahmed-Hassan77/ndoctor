"use client";

import { RouteError } from "@/components/route-error";

export default function MainError({ error, reset }) {
  return <RouteError error={error} reset={reset} />;
}
