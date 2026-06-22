"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Star } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { HomeSectionHeading } from "./home-section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const ITEMS = [
  { key: "1", avatar: "K", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  { key: "2", avatar: "L", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400" },
  { key: "3", avatar: "H", color: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  { key: "4", avatar: "A", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
];

export function HomeTestimonials() {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const count = ITEMS.length;

  const visible = [
    ITEMS[index % count],
    ITEMS[(index + 1) % count],
    ITEMS[(index + 2) % count],
  ];

  return (
    <section className="bg-card py-14 md:py-16">
      <div className="container mx-auto px-4">
        <HomeSectionHeading title={t("home.testimonialsTitle")} icon={FileText} />
        <div className="mx-auto max-w-6xl">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {visible.map((item) => (
              <motion.article
                variants={fadeInUp}
                key={item.key}
                className="home-card-gradient rounded-2xl border-0 p-6 ring-1 ring-primary/10"
              >
                <p className="mb-4 text-5xl leading-none text-muted-foreground/30">
                  &ldquo;
                </p>
                <div className="mb-4 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={cn(
                        "size-4",
                        i <= 4
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                  {t(`home.testimonial${item.key}Text`)}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full text-lg font-bold",
                      item.color
                    )}
                  >
                    {item.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {t(`home.testimonial${item.key}Name`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`home.testimonial${item.key}Location`)}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + count) % count)}
              className="flex size-11 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label={t("home.testimonialsPrev")}
            >
              <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
            </button>
            <div className="flex gap-2">
              {ITEMS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === i ? "w-8 bg-primary" : "w-2 bg-muted-foreground/30"
                  )}
                  aria-label={`${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % count)}
              className="flex size-11 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
              aria-label={t("home.testimonialsNext")}
            >
              <ChevronLeft className="size-5 text-muted-foreground rtl:rotate-180" />
            </button>
          </div>

          <div className="mt-8 text-center">
            <Button asChild size="lg" className="rounded-xl px-8">
              <Link href="/doctors">{t("home.viewAllDoctors")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
