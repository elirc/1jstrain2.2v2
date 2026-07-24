import "./globals.css";
import NavBar from "@/components/NavBar";
import { getDb } from "@/lib/db";

export const metadata = {
  title: "MarketForge - Multi Vendor Marketplace",
  description: "Shopify meets Etsy marketplace MVP built with Next.js and SQLite."
};

export default function RootLayout({ children }) {
  getDb();

  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}

