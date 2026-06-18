"use client";

import { Heart, Star, Users, Video } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const STATS = [
  { key: "consultations", icon: Video, value: "320+" },
  { key: "patients", icon: Users, value: "1,200+" },
  { key: "experts", icon: Heart, value: "450+" },
  { key: "rating", icon: Star, value: "95+" },
];

export function HomeStatistics() {
  const { t } = useLocale();

  return (
    <section className="bg-gradient-to-br from-primary/8 via-background to-background py-14 md:py-16">
      <div className="container mx-auto px-4">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {STATS.map(({ key, icon: Icon, value }) => (
            <motion.div
              variants={fadeInUp}
              key={key}
              className="group rounded-2xl bg-card p-5 text-center shadow-md ring-1 ring-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg md:p-6"
            >
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-900 shadow-md transition-transform group-hover:scale-105 md:size-16">
                <Icon className="size-7 text-primary-foreground md:size-8" />
              </div>
              <p className="gradient-title mb-1 text-2xl font-bold md:text-3xl">{value}</p>
              <p className="text-xs font-medium text-muted-foreground md:text-sm">
                {t(`home.stat.${key}`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
