import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/600-italic.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/600.css";
import "./globals.css";
import "./language.css";
import { cookies } from "next/headers";
import { LanguageProvider } from "@/components/language-provider";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Mehria Pulao | Familiar Flavours, Islamabad",
    template: "%s | Mehria Pulao",
  },
  description:
    "Discover Mehria Murgh Pulao in G-11 Markaz, Islamabad. Explore chicken pulao, biryani, shami kabab and zarda, and find restaurant contact and ordering information.",
  robots:
    process.env.ORDERING_ENABLED === "true"
      ? { index: true, follow: true }
      : { index: false, follow: false },
  openGraph: {
    title: "Mehria Pulao | A little more flavour. A little more home.",
    description: "Familiar flavours from G-11 Markaz, Islamabad.",
    type: "website",
    locale: "en_PK",
    images: [
      {
        url: "/images/mehria-table.jpg",
        width: 1020,
        height: 380,
        alt: "Mehria's published pulao photograph",
      },
    ],
  },
};
export const viewport: Viewport = { themeColor: "#a92526" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const language =
    (await cookies()).get("mehria-language")?.value === "ur" ? "ur" : "en";
  return (
    <html lang={language} dir={language === "ur" ? "rtl" : "ltr"} data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          {language === "ur" ? "مواد پر جائیں" : "Skip to content"}
        </a>
        <LanguageProvider initialLanguage={language}>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
