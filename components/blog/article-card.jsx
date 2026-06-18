"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   article: {
 *     slug: string;
 *     image: string;
 *     date: string;
 *     title: string;
 *     excerpt: string;
 *     category?: string;
 *   };
 *   compact?: boolean;
 *   uniform?: boolean;
 *   className?: string;
 * }} props
 */
export function ArticleCard({
  article,
  compact = false,
  uniform = false,
  className = "",
}) {
  const { t } = useLocale();

  return (
    <article
      className={cn(
        "group flex flex-col rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border/60 transition-all hover:-translate-y-1 hover:shadow-md md:p-6",
        uniform && "h-full min-h-[400px]",
        className
      )}
    >
      <Link href={`/blog/${article.slug}`} className="flex flex-1 flex-col">
        <div
          className={cn(
            "relative mb-4 shrink-0 overflow-hidden rounded-xl",
            uniform ? "h-40" : compact ? "h-36" : "h-44"
          )}
        >
          <Image
            src={article.image}
            alt=""
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={uniform ? "320px" : "(max-width: 768px) 280px, 16vw"}
          />
          {article.category ? (
            <span className="absolute start-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground">
              {article.category}
            </span>
          ) : null}
        </div>
        <div className="mb-3 flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
          <CalendarCheck className="size-4 shrink-0" />
          <span className="truncate">{article.date}</span>
        </div>
        <h3
          className={cn(
            "mb-2 shrink-0 font-bold transition-colors group-hover:text-primary",
            uniform && "line-clamp-2 min-h-[3.25rem] text-base leading-snug",
            !uniform && (compact ? "text-lg" : "text-xl")
          )}
        >
          {article.title}
        </h3>
        <p
          className={cn(
            "text-sm text-muted-foreground",
            uniform ? "line-clamp-3 min-h-[4rem] flex-1" : "mb-4 line-clamp-2"
          )}
        >
          {article.excerpt}
        </p>
      </Link>
      <Link
        href={`/blog/${article.slug}`}
        className="mt-auto inline-flex shrink-0 items-center gap-2 pt-2 text-sm font-semibold text-primary"
      >
        {t("home.blogReadMore")}
        <ArrowRight className="size-4 rtl:rotate-180" />
      </Link>
    </article>
  );
}
