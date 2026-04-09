import { AuthProvider } from "@/components/auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { NowProvider } from "@/components/now-provider";
import { Providers } from "@/components/query-provider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "DeckNinja",
  description:
    "A flashcard app using spaced repetition algorithm with Firebase authentication.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans dark bg-background text-foreground",
        geist.variable,
      )}
    >
      <body suppressHydrationWarning>
        <NextTopLoader color="var(--primary)" showSpinner={false} />
        <ErrorBoundary>
          <AuthProvider>
            <Providers>
              <NowProvider>{children}</NowProvider>
            </Providers>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
