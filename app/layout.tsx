import Link from "next/link";
import { Chakra_Petch, Source_Sans_3 } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AdSlot } from "@/components/ad-slot";
import { HtmlLang } from "@/components/html-lang";
import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";
import "./globals.css";

const display = Chakra_Petch({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-chakra",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source",
});

export const metadata = {
  title: "Qué Jugamos",
  description: "Elijan a qué juego de Steam jugar juntos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>
        <Suspense fallback={<header className="header"><Link className="wordmark" href="/">Qué Jugamos</Link></header>}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await getSession();
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLang locale={locale} />
      <SiteHeader session={session} />
      <main>{children}</main>
      <AdSlot />
    </NextIntlClientProvider>
  );
}
