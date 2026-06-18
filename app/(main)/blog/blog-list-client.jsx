"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ArticleCard } from "@/components/blog/article-card";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/locale-provider";
import { getFeaturedArticles } from "@/lib/articles";
import { FileText } from "lucide-react";

/** @param {{ locale: string }} props */
export function BlogListClient({ locale }) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const articles = useMemo(() => getFeaturedArticles(locale), [locale]);

  const filtered = articles.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader icon={<FileText />} title={t("blog.pageTitle")} backLink="/" />
      <p className="-mt-4 mb-8 text-center text-muted-foreground md:text-lg">
        {t("blog.pageSubtitle")}
      </p>

      <div className="relative mx-auto mb-10 max-w-xl">
        <Search className="absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("blog.searchPlaceholder")}
          className="ps-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground">{t("blog.noResults")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <ArticleCard key={article.slug} article={article} compact />
          ))}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          {t("blog.backHome")}
        </Link>
      </div>
    </div>
  );
}
