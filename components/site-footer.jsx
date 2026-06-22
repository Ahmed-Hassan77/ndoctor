"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Heart,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";

const SOCIAL = [
  { icon: Share2, href: "#", labelKey: "Facebook" },
  { icon: Globe, href: "#", labelKey: "Instagram" },
  { icon: MessageCircle, href: "https://wa.me/201012263917", labelKey: "WhatsApp" },
  { icon: Share2, href: "#", labelKey: "LinkedIn" },
];

export function SiteFooter() {
  const { t, locale, dir } = useLocale();
  const year = new Date().getFullYear();
  const address =
    locale === "ar" ? t("footer.addressAr") : t("footer.addressEn");

  const [email, setEmail] = useState("");

  const submitNewsletter = (e) => {
    e.preventDefault();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!ok) {
      toast.error(t("footer.newsletterInvalid"));
      return;
    }
    toast.success(t("footer.newsletterThanks"));
    setEmail("");
  };

  const patientLinks = [
    { href: "/doctors", label: t("footer.browseSpecialties") },
    { href: "/appointments", label: t("footer.appointments") },
    { href: "/patient/profile", label: t("footer.medicalProfile") },
    { href: "/sign-in", label: t("nav.signIn") },
  ];

  const importantLinks = [
    { href: "/", label: t("footer.home") },
    { href: "/doctors", label: t("footer.findDoctors") },
    { href: "/pricing", label: t("footer.pricing") },
    { href: "/support", label: t("footer.support") },
  ];

  return (
    <footer dir={dir} className="footer-gradient text-white">
      <div className="container mx-auto max-w-[1400px] px-4 py-12 md:py-16">
        <div className="mb-10 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-xl font-bold">{t("footer.newsletterTitle")}</h3>
            <p className="mb-4 text-sm text-white/75">{t("footer.newsletterDesc")}</p>
            <form
              onSubmit={submitNewsletter}
              className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("footer.newsletterPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
                required
              />
              <button
                type="submit"
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-5 py-2.5 font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 sm:w-auto"
              >
                <span>{t("footer.newsletterButton")}</span>
                <ArrowRight className="size-4 rtl:rotate-180" />
              </button>
            </form>
          </div>

          <FooterCol
            title={t("footer.forPatients")}
            links={patientLinks}
            underline
          />
          <FooterCol
            title={t("footer.importantLinks")}
            links={importantLinks}
            underline
          />

          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                <Heart className="size-6 text-white" />
              </div>
              <Image
                src="/logo-single.png"
                alt={t("footer.brandName")}
                width={160}
                height={48}
                className="h-9 w-auto max-w-[140px] object-contain brightness-0 invert"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 space-y-3 text-sm">
              <a
                href="tel:+201012263917"
                className="flex items-center gap-2 text-white/80 transition hover:text-white"
              >
                <Phone className="size-5 shrink-0 text-white/60" />
                01012263917
              </a>
              <a
                href="mailto:shifaa772004@gmail.com"
                className="flex items-center gap-2 text-white/80 transition hover:text-white"
              >
                <Mail className="size-5 shrink-0 text-white/60" />
                shifaa772004@gmail.com
              </a>
              <p className="flex items-start gap-2 text-white/80">
                <MapPin className="mt-0.5 size-5 shrink-0 text-white/60" />
                {address}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {SOCIAL.map(({ icon: Icon, href, labelKey }) => (
                <a
                  key={labelKey}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={labelKey}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 text-sm text-white/65 sm:flex-row sm:text-start">
          <p>{t("footer.rights", { year })}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/support" className="hover:text-white">
              {t("footer.privacy")}
            </Link>
            <span aria-hidden className="text-white/35">
              |
            </span>
            <Link href="/support" className="hover:text-white">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links, underline }) {
  return (
    <div>
      <h3
        className={
          underline
            ? "mb-4 inline-block border-b-2 border-primary pb-2 text-xl font-bold"
            : "mb-4 text-xl font-bold"
        }
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-white/75 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
