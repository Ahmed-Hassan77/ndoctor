import { Almarai } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA, enUS } from "@clerk/localizations";
import { Toaster } from "sonner";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { ShifaaChatbotLazy } from "@/components/chatbot/lazy-chatbot";
import { SiteFooter } from "@/components/site-footer";
import {
  normalizeLocale,
  getDir,
  getLang,
  LOCALE_COOKIE,
} from "@/lib/i18n";
import { getServerI18n } from "@/lib/server-i18n";
import { themeInitScriptContent } from "@/lib/theme-init";

const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-almarai",
  display: "swap",
});

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.siteTitle"),
    description: t("meta.siteDescription"),
  };
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const dir = getDir(locale);
  const lang = getLang(locale);
  const arLocalization = {
    ...arSA,
    formFieldInputPlaceholder__emailAddress: "أدخل بريدك الإلكتروني",
    formFieldInputPlaceholder__password: "أدخل كلمة المرور",
    formFieldInputPlaceholder__emailAddress_username: "البريد الإلكتروني أو اسم المستخدم",
    formFieldInputPlaceholder__firstName: "الاسم الأول",
    formFieldInputPlaceholder__lastName: "اسم العائلة",
    formFieldInputPlaceholder__username: "اسم المستخدم",
    formFieldInputPlaceholder__phoneNumber: "رقم الهاتف",
    formFieldInputPlaceholder__signUpPassword: "أنشئ كلمة مرور"
  };

  const clerkLocalization = locale === "ar" ? arLocalization : enUS;

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={almarai.variable}
    >
      <head>
        <link rel="icon" href="/logo.png" sizes="any" />
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScriptContent() }}
          suppressHydrationWarning
        />
      </head>
      <body className={`${almarai.className} font-sans`} suppressHydrationWarning>
        <ClerkProvider
          localization={clerkLocalization}
          signInFallbackRedirectUrl="/onboarding"
          signUpFallbackRedirectUrl="/onboarding"
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LocaleProvider locale={locale}>
              <Header />
              <main className="min-h-screen bg-gradient-to-br from-primary/[0.05] via-background to-muted/40 pt-[4.5rem]">
                {children}
              </main>
              <Toaster richColors position={dir === "rtl" ? "top-left" : "top-right"} />
              <ShifaaChatbotLazy />
              <SiteFooter />
            </LocaleProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
