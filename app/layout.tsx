import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coupon Code Tracker",
  description:
    "Internal tracker for Pulse & Cocktails coupon redemptions across online and in-store channels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
