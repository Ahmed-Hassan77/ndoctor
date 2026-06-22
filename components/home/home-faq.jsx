"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { HomeSectionHeading } from "./home-section-heading";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const FAQ_KEYS = ["video", "upload", "hours", "choose", "privacy"];

export function HomeFaq() {
  const { t } = useLocale();
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section
      id="faq"
      className="bg-gradient-to-br from-muted/40 to-background py-14 md:py-16"
    >
      <div className="container mx-auto px-4">
        <HomeSectionHeading title={t("home.faqTitle")} />
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="mx-auto max-w-3xl space-y-3">
          {FAQ_KEYS.map((key, index) => {
            const open = openIndex === index;
            return (
              <motion.button
                variants={fadeInUp}
                key={key}
                type="button"
                onClick={() => setOpenIndex(open ? null : index)}
                className={cn(
                  "w-full rounded-xl bg-muted/70 p-5 text-start transition-colors hover:bg-muted",
                  open && "bg-muted"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="flex-1 text-base font-semibold text-foreground md:text-lg">
                    {t(`home.faq.${key}.q`)}
                  </h3>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background">
                    {open ? (
                      <Minus className="size-4 text-muted-foreground" />
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </span>
                </div>
                {open ? (
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {t(`home.faq.${key}.a`)}
                  </p>
                ) : null}
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
