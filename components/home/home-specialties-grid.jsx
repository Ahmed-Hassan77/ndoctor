"use client";

import Link from "next/link";
import {
  Baby,
  Bone,
  BrainCircuit,
  Eye,
  Heart,
  Layers,
  Smile,
  Stethoscope,
} from "lucide-react";
import { buildDoctorSearchQueryString } from "@/lib/doctor-discovery-params";
import { useLocale } from "@/components/locale-provider";
import { HomeSectionHeading } from "./home-section-heading";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const TILES = [
  { name: "Orthopedics", icon: Bone, bg: "bg-orange-100 dark:bg-orange-500/10", color: "text-orange-600 dark:text-orange-400" },
  { name: "Dermatology", icon: Layers, bg: "bg-cyan-100 dark:bg-cyan-500/10", color: "text-cyan-600 dark:text-cyan-400" },
  { name: "Pediatrics", icon: Baby, bg: "bg-blue-100 dark:bg-blue-500/10", color: "text-blue-600 dark:text-blue-400" },
  { name: "Cardiology", icon: Heart, bg: "bg-pink-100 dark:bg-pink-500/10", color: "text-pink-600 dark:text-pink-400" },
  { name: "Psychiatry", icon: BrainCircuit, bg: "bg-indigo-100 dark:bg-indigo-500/10", color: "text-indigo-600 dark:text-indigo-400" },
  { name: "Ophthalmology", icon: Eye, bg: "bg-emerald-100 dark:bg-emerald-500/10", color: "text-emerald-600 dark:text-emerald-400" },
  { name: "General Medicine", icon: Stethoscope, bg: "bg-amber-100 dark:bg-amber-500/10", color: "text-amber-600 dark:text-amber-400" },
  { name: "Obstetrics & Gynecology", icon: Smile, bg: "bg-sky-100 dark:bg-sky-500/10", color: "text-sky-600 dark:text-sky-400" },
];

export function HomeSpecialtiesGrid() {
  const { t, labels } = useLocale();

  return (
    <section className="bg-card py-14 md:py-16">
      <div className="container mx-auto px-4">
        <HomeSectionHeading title={t("home.browseBySpecialty")} />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="mx-auto grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4 md:gap-6">
          {TILES.map(({ name, icon: Icon, bg, color }) => (
            <motion.div variants={fadeInUp} key={name} className="h-full">
              <Link
                href={`/doctors?${buildDoctorSearchQueryString({
                q: "",
                specialty: name,
                governorate: "",
                area: "",
                mode: "all",
                minRating: null,
                minExperience: null,
                minPrice: null,
                maxPrice: null,
                availableToday: false,
                sort: "rating",
              })}`}
              className={`${bg} block h-full w-full rounded-2xl border-2 border-transparent p-5 text-center transition-all duration-300 hover:scale-[1.03] hover:border-primary/25 hover:shadow-lg md:p-6`}
            >
              <div
                className={`mx-auto mb-3 flex size-14 items-center justify-center rounded-xl ${bg} md:mb-4 md:size-16`}
              >
                <Icon className={`size-7 md:size-8 ${color}`} />
              </div>
              <p className="text-sm font-semibold text-foreground md:text-base">
                {labels.specialty(name)}
              </p>
            </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
