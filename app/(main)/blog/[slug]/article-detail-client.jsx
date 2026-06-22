"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Calendar,
  Clock,
  Tag,
  User,
} from "lucide-react";
import { ArticleCard } from "@/components/blog/article-card";
import { useLocale } from "@/components/locale-provider";
import { getFeaturedArticles } from "@/lib/articles";

/**
 * @param {{
 *   article: {
 *     slug: string;
 *     image: string;
 *     category: string;
 *     date: string;
 *     readTime: string;
 *     title: string;
 *     excerpt: string;
 *     author: string;
 *     authorRole: string;
 *     content: string;
 *   };
 *   locale: string;
 * }} props
 */
export function ArticleDetailClient({ article, locale }) {
  const { t } = useLocale();

  const related = getFeaturedArticles(locale)
    .filter((a) => a.slug !== article.slug)
    .slice(0, 2);

  return (
    <article>
      <div className="relative -mx-4 mb-8 h-56 overflow-hidden sm:mx-0 sm:mb-10 sm:h-72 sm:rounded-2xl md:h-96">
        <Image
          src={article.image}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
          <Link
            href="/blog"
            className="mb-4 inline-flex items-center gap-2 text-sm text-white/85 hover:text-white"
          >
            <ArrowRight className="size-4 rtl:rotate-180" />
            {t("blog.backToBlog")}
          </Link>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold">
            <Tag className="size-3.5" />
            {article.category}
          </span>
          <h1 className="text-2xl font-bold leading-tight md:text-4xl">
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-2">
              <User className="size-4" />
              <span>
                {article.author}
                <span className="text-white/70"> · {article.authorRole}</span>
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4" />
              {article.date}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" />
              {article.readTime}
            </span>
          </div>
        </div>
      </div>

      <div
        className="article-content mx-auto max-w-3xl space-y-4 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ms-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-2"
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {related.length > 0 ? (
        <section className="mt-14 border-t border-border/60 pt-10">
          <h2 className="gradient-title mb-6 text-2xl font-bold">
            {t("blog.relatedArticles")}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {related.map((item) => (
              <ArticleCard key={item.slug} article={item} compact />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
