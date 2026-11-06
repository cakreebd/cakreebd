import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cakree | Find your next opportunity",
  description:
    "Discover job opportunities across Bangladesh, build your professional profile, and connect with employers on Cakree.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-BD">
      <body>{children}</body>
    </html>
  );
}
