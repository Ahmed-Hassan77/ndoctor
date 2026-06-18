import { getServerI18n } from "@/lib/server-i18n";
import { BlogListClient } from "./blog-list-client";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: `${t("blog.pageTitle")} - MediMeet`,
    description: t("blog.pageSubtitle"),
  };
}

export default async function BlogPage() {
  const { locale } = await getServerI18n();
  return <BlogListClient locale={locale} />;
}
