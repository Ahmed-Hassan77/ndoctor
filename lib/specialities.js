import {
  Activity,
  Baby,
  Bone,
  Brain,
  BrainCircuit,
  CircleDot,
  Droplets,
  Eye,
  FlaskConical,
  Flower2,
  HeartPulse,
  Microscope,
  Pill,
  ScanLine,
  Stethoscope,
  Target,
  Timer,
  Wind,
} from "lucide-react";

export const OTHER_SPECIALTY = "Other";

/** @type {Array<{ name: string; icon: import("lucide-react").LucideIcon; accent: string; bg: string }>} */
export const SPECIALTIES = [
  {
    name: "General Medicine",
    icon: Stethoscope,
    accent: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/15",
  },
  {
    name: "Cardiology",
    icon: HeartPulse,
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-100 dark:bg-rose-500/15",
  },
  {
    name: "Dermatology",
    icon: CircleDot,
    accent: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-100 dark:bg-cyan-500/15",
  },
  {
    name: "Endocrinology",
    icon: Timer,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-500/15",
  },
  {
    name: "Gastroenterology",
    icon: Pill,
    accent: "text-lime-600 dark:text-lime-400",
    bg: "bg-lime-100 dark:bg-lime-500/15",
  },
  {
    name: "Neurology",
    icon: Brain,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-500/15",
  },
  {
    name: "Obstetrics & Gynecology",
    icon: Flower2,
    accent: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-100 dark:bg-pink-500/15",
  },
  {
    name: "Oncology",
    icon: Target,
    accent: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-500/15",
  },
  {
    name: "Ophthalmology",
    icon: Eye,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/15",
  },
  {
    name: "Orthopedics",
    icon: Bone,
    accent: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-500/10",
  },
  {
    name: "Pediatrics",
    icon: Baby,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/15",
  },
  {
    name: "Psychiatry",
    icon: BrainCircuit,
    accent: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-100 dark:bg-indigo-500/15",
  },
  {
    name: "Pulmonology",
    icon: Wind,
    accent: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-500/15",
  },
  {
    name: "Radiology",
    icon: ScanLine,
    accent: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-100 dark:bg-teal-500/15",
  },
  {
    name: "Urology",
    icon: Droplets,
    accent: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    name: OTHER_SPECIALTY,
    icon: Microscope,
    accent: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-500/15",
  },
];

const SPECIALTY_MAP = new Map(SPECIALTIES.map((entry) => [entry.name, entry]));

const FALLBACK_SPECIALTY = {
  icon: FlaskConical,
  accent: "text-primary",
  bg: "bg-primary/10",
};

/**
 * @param {string | null | undefined} name
 */
export function getSpecialtyVisual(name) {
  if (!name?.trim()) return FALLBACK_SPECIALTY;
  return SPECIALTY_MAP.get(name.trim()) ?? FALLBACK_SPECIALTY;
}
