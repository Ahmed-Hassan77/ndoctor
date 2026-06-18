"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { getFeaturedArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/blog/article-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const SLIDE_WIDTH = 320;
const SLIDE_GAP = 20;

export function HomeBlogPreview() {
  const { t, locale, dir } = useLocale();
  const articles = getFeaturedArticles(locale, 6);
  const scrollRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 2) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const sl = Math.abs(el.scrollLeft);
    setCanPrev(sl > 2);
    setCanNext(sl < max - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, articles.length]);

  const scrollByStep = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = SLIDE_WIDTH + SLIDE_GAP;
    const isRtl = dir === "rtl";
    const delta =
      direction === "next"
        ? isRtl
          ? -step
          : step
        : isRtl
          ? step
          : -step;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="bg-muted/30 py-14 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <div>
            <h2 className="gradient-title text-3xl font-bold md:text-4xl">
              {t("home.blogTitle")}
            </h2>
            <div
              aria-hidden
              className="mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-primary to-blue-900"
            />
          </div>
          <Link
            href="/blog"
            className="hidden items-center gap-2 font-semibold text-primary hover:underline sm:inline-flex"
          >
            {t("home.blogViewAll")}
            <ArrowRight className="size-5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("home.blogPrev")}
            disabled={!canPrev}
            onClick={() => scrollByStep("prev")}
            className={cn(
              "absolute start-0 top-1/2 z-10 hidden size-11 -translate-y-1/2 rounded-full border-primary/20 bg-card shadow-md md:inline-flex",
              !canPrev && "opacity-40"
            )}
          >
            <ChevronLeft className="size-6 rtl:rotate-180" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("home.blogNext")}
            disabled={!canNext}
            onClick={() => scrollByStep("next")}
            className={cn(
              "absolute end-0 top-1/2 z-10 hidden size-11 -translate-y-1/2 rounded-full border-primary/20 bg-card shadow-md md:inline-flex",
              !canNext && "opacity-40"
            )}
          >
            <ChevronRight className="size-6 rtl:rotate-180" />
          </Button>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            ref={scrollRef}
            dir={dir}
            className="blog-row-scroll flex gap-5 overflow-x-auto scroll-smooth px-1 pb-2 snap-x snap-mandatory md:px-14"
          >
            {articles.map((article) => (
              <motion.div
                variants={fadeInUp}
                key={article.slug}
                data-blog-slide
                style={{ width: SLIDE_WIDTH }}
                className="h-[400px] shrink-0 snap-start"
              >
                <ArticleCard article={article} uniform className="h-full" />
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-6 flex justify-center gap-3 md:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("home.blogPrev")}
              disabled={!canPrev}
              onClick={() => scrollByStep("prev")}
              className="size-10 rounded-full"
            >
              <ChevronLeft className="size-5 rtl:rotate-180" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("home.blogNext")}
              disabled={!canNext}
              onClick={() => scrollByStep("next")}
              className="size-10 rounded-full"
            >
              <ChevronRight className="size-5 rtl:rotate-180" />
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 font-semibold text-primary"
          >
            {t("home.blogViewAll")}
            <ArrowRight className="size-5 rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
}
