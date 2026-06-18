import { notFound } from "next/navigation";
import { getServerI18n } from "@/lib/server-i18n";
import { getArticleBySlug, getLocalizedArticle } from "@/lib/articles";
import { ArticleDetailClient } from "./article-detail-client";

/** @param {{ params: Promise<{ slug: string }> }} props */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { locale, t } = await getServerI18n();
  const article = getLocalizedArticle(slug, locale);
  if (!article) return { title: t("meta.siteTitle") };
  return {
    title: t("meta.articleTitleTemplate", { title: article.title }),
    description: article.excerpt,
  };
}

/** @param {{ params: Promise<{ slug: string }> }} props */
export default async function BlogArticlePage({ params }) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) notFound();
  const { locale } = await getServerI18n();
  const article = getLocalizedArticle(slug, locale);
  if (!article) notFound();

  return <ArticleDetailClient article={article} locale={locale} />;
}
