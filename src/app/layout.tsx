import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cakree | Find Job that moves you forward",
  description:
    "Discover meaningful job opportunities from Bangladesh's most-loved companies. Find your next move with Cakree.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-BD">
      <body>{children}</body>
    </html>
  );
}
