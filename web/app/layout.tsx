import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Diabetic Meal Planner",
  description: "Track blood glucose and meals with analysis and recommendations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3 text-sm">
            <div className="font-semibold">
              <Link href="/" className="hover:text-emerald-400">
                Diabetic Meal Planner
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-emerald-400">
                Dashboard
              </Link>
              <Link href="/meals" className="hover:text-emerald-400">
                Meals
              </Link>
            </div>
          </nav>
        </header>

        {children}
      </body>
    </html>
  );
}
