import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { DataProvider } from "@/lib/data";

export const metadata: Metadata = { title: "Mony — personal money manager", description: "Track salary, EMIs, expenses, budgets and goals." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

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
