"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Search,
  Shield,
  Sparkles,
  Star,
  Users,
  Video,
} from "lucide-react";
import { DoctorCard } from "@/app/(main)/doctors/components/doctor-card";
import { DoctorsCarousel } from "@/components/doctors/doctors-carousel";
import { DatabaseErrorAlert } from "@/components/database-error-alert";
import { DB_UNAVAILABLE } from "@/lib/db-safe";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import { HomeSectionHeading } from "./home-section-heading";
import { HomeStatistics } from "./home-statistics";
import { HomeSpecialtiesGrid } from "./home-specialties-grid";
import { HomeFaq } from "./home-faq";
import { HomeTestimonials } from "./home-testimonials";
import { HomeBlogPreview } from "./home-blog-preview";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer, fadeInLeft, fadeInRight, float } from "@/lib/animations";

/**
 * @param {{ featuredDoctors?: object[]; dbError?: string | null }} props
 */
export function HomePage({ featuredDoctors = [], dbError = null }) {
  const { t, dir } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const onHeroSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/doctors?q=${encodeURIComponent(q)}` : "/doctors");
  };

  return (
    <div dir={dir} className="min-w-0">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden border-b border-border/60 pt-4 md:min-h-[90vh]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-background to-muted/40"
        />
        <div className="relative container mx-auto px-4 py-10 md:py-14">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInLeft}
              className={cn(
                "relative mx-auto hidden max-w-lg lg:block",
                dir === "ltr" && "lg:order-2"
              )}
            >
              <Image
                src="/hero-doctor.png"
                alt=""
                width={480}
                height={600}
                className="mx-auto h-[min(500px,58vh)] w-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
                priority
              />
              <motion.div variants={float} animate="animate" className="absolute top-14 end-6 z-10 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <Star className="size-5 fill-primary text-primary" />
                  <span className="text-sm font-bold">{t("home.heroFloatingRating")}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t("home.heroFloatingRatingSub")}
                </p>
              </motion.div>
              <motion.div variants={float} animate="animate" transition={{ delay: 0.5 }} className="absolute bottom-28 start-6 z-10 rounded-2xl border border-border/60 bg-card/95 p-3 shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full bg-green-500" />
                  <span className="text-sm font-bold">{t("home.heroFloatingVerified")}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t("home.heroFloatingVerifiedSub")}
                </p>
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInRight}
              className={cn("min-w-0 space-y-6", dir === "ltr" && "lg:order-1")}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/90 px-4 py-2 text-sm font-medium shadow-sm backdrop-blur-sm">
                <span className="inline-block size-2 rounded-full bg-primary" />
                <span>{t("home.heroEyebrow")}</span>
              </div>

              <div className="text-center lg:text-start">
                <h1 className="text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
                  {t("home.headline")}
                  <span className="mt-2 block gradient-title">{t("home.headlineAccent")}</span>
                </h1>
                <p className="mt-4 text-lg text-muted-foreground md:text-xl">
                  {t("home.subhead")}
                </p>
                <p className="mt-2 text-lg font-semibold gradient-title md:text-xl">
                  {t("home.subheadGradient")}
                </p>
              </div>

              {dbError === DB_UNAVAILABLE ? (
                <DatabaseErrorAlert code={DB_UNAVAILABLE} className="mx-auto lg:mx-0" />
              ) : null}

              <form
                onSubmit={onHeroSearch}
                className="mx-auto flex max-w-xl gap-2 rounded-2xl bg-card p-2 shadow-xl ring-1 ring-primary/10 lg:mx-0"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("home.heroSearchPlaceholder")}
                  className="min-h-12 flex-1 rounded-xl border-0 bg-transparent px-4 text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button type="submit" size="lg" className="shrink-0 rounded-xl px-6">
                  <Search className="me-2 size-5" />
                  {t("home.searchDoctors")}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground lg:text-start">
                <Link
                  href="/doctors"
                  className="font-medium text-primary hover:underline"
                >
                  {t("home.advancedSearchLink")}
                </Link>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground lg:justify-start">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="inline-block size-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/80 to-primary"
                    />
                  ))}
                </div>
                <span className="font-medium">{t("home.heroSocialProof")}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <HomeStatistics />

      {/* Integrated solutions */}
      <section className="bg-card py-14 md:py-16">
        <div className="container mx-auto px-4">
          <HomeSectionHeading title={t("home.solutionsTitle")} icon={Sparkles} />
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <SolutionCard
              icon={Calendar}
              title={t("home.solutionBookingTitle")}
              description={t("home.solutionBookingDesc")}
              href="/doctors"
              discoverLabel={t("home.discoverMore")}
            />
            <SolutionCard
              icon={Video}
              title={t("home.solutionVideoTitle")}
              description={t("home.solutionVideoDesc")}
              href="/doctors?mode=online"
              discoverLabel={t("home.discoverMore")}
              highlighted
            />
          </motion.div>
        </div>
      </section>

      {/* EMR + AI */}
      <section className="bg-gradient-to-br from-muted/40 to-background py-14 md:py-16">
        <div className="container mx-auto px-4">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <SolutionCard
              icon={FileText}
              title={t("home.solutionEmrTitle")}
              description={t("home.solutionEmrDesc")}
              href="/sign-up"
              discoverLabel={t("home.discoverMore")}
            />
            <SolutionCard
              icon={MessageSquare}
              title={t("home.solutionAiTitle")}
              description={t("home.solutionAiDesc")}
              href="/doctors"
              discoverLabel={t("home.discoverMore")}
            />
          </motion.div>
        </div>
      </section>

      <HomeSpecialtiesGrid />

      {featuredDoctors.length > 0 ? (
        <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} className="border-y border-border/60 bg-background py-14 md:py-16">
          <div className="container mx-auto px-4">
            <HomeSectionHeading title={t("home.featuredDoctors")} />
            <p className="-mt-8 mb-10 text-center text-muted-foreground">
              {t("home.featuredSubtitle")}
            </p>
            <DoctorsCarousel className="px-1 sm:px-6 md:px-10">
              {featuredDoctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} variant="carousel" />
              ))}
            </DoctorsCarousel>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link href="/doctors">{t("home.viewAllDoctors")}</Link>
              </Button>
            </div>
          </div>
        </motion.section>
      ) : null}

      <HomeFaq />

      {/* Doctor registration CTA */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} className="relative overflow-hidden bg-gradient-to-br from-primary to-blue-900 py-14 text-primary-foreground md:py-16">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]"
        />
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-xl bg-white/20">
              <Users className="size-8" />
            </div>
            <h2 className="mb-6 text-3xl font-bold md:text-4xl">{t("home.doctorCtaBandTitle")}</h2>
            <p className="mb-8 text-lg leading-relaxed text-primary-foreground/90 md:text-xl">
              {t("home.doctorCtaBandDesc")}
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-xl bg-card px-8 text-primary hover:bg-card/90"
            >
              <Link href="/sign-up">
                {t("home.doctorCtaButton")}
                <ArrowRight className="ms-2 size-5 rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <HomeTestimonials />

      {/* Platform features */}
      <section className="bg-card py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center md:mb-14">
            <h2 className="gradient-title mb-3 text-2xl font-bold md:text-4xl">
              {t("home.featuresTitle")}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground md:text-lg">
              {t("home.featuresSubtitle")}
            </p>
          </div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
            {[
              { icon: Users, title: t("home.feature1Title"), desc: t("home.feature1Desc") },
              { icon: Clock, title: t("home.feature2Title"), desc: t("home.feature2Desc") },
              { icon: Shield, title: t("home.feature3Title"), desc: t("home.feature3Desc") },
            ].map((item) => (
              <motion.article
                variants={fadeInUp}
                key={item.title}
                className="home-card-gradient rounded-2xl p-6 text-center transition-transform duration-300 hover:scale-[1.02] md:p-8"
              >
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-900 shadow-lg">
                  <item.icon className="size-8 text-primary-foreground" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Support CTA */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} className="bg-background py-14 md:py-16">
        <div className="container mx-auto px-4">
          <div className="home-card-gradient mx-auto max-w-2xl rounded-2xl p-8 text-center md:p-10">
            <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">
              {t("home.supportCtaTitle")}
            </h2>
            <Button asChild size="lg" className="rounded-xl px-8">
              <Link href="/support">{t("home.supportCtaButton")}</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      <HomeBlogPreview />
    </div>
  );
}

/**
 * @param {{
 *   icon: React.ComponentType<{ className?: string }>;
 *   title: string;
 *   description: string;
 *   href: string;
 *   discoverLabel: string;
 *   highlighted?: boolean;
 * }} props
 */
function SolutionCard({
  icon: Icon,
  title,
  description,
  href,
  discoverLabel,
  highlighted = false,
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "rounded-2xl p-6 md:p-8",
        highlighted
          ? "bg-gradient-to-br from-primary to-blue-900 text-primary-foreground shadow-lg"
          : "home-card-gradient ring-1 ring-primary/10"
      )}
    >
      <div
        className={cn(
          "mb-6 flex size-16 items-center justify-center rounded-xl",
          highlighted ? "bg-white/20" : "bg-primary/10"
        )}
      >
        <Icon className={cn("size-8", highlighted ? "text-primary-foreground" : "text-primary")} />
      </div>
      <h3 className="mb-4 text-2xl font-bold">{title}</h3>
      <p
        className={cn(
          "mb-6 leading-relaxed",
          highlighted ? "text-primary-foreground/85" : "text-muted-foreground"
        )}
      >
        {description}
      </p>
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-2 font-semibold hover:underline",
          highlighted ? "text-primary-foreground" : "text-primary"
        )}
      >
        {discoverLabel}
        <ArrowRight className="size-5 rtl:rotate-180" />
      </Link>
    </motion.div>
  );
}
