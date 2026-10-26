import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/data";

export const metadata: Metadata = {
  title: "Mony", description: "Track salary, EMIs, expenses, budgets and goals.",
  applicationName: "Mony",
  appleWebApp: { capable: true, title: "Mony", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192", apple: "/apple-icon" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#9b3fd6" };

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-poppins" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <AuthProvider>
          <DataProvider>{children}</DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
