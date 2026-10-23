import type { Metadata } from "next";
import { Literata, Schibsted_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const grotesk = Schibsted_Grotesk({ variable: "--font-grotesk", subsets: ["latin"] });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "BookLeaf Author Support", template: "%s | BookLeaf" },
  description: "Royalties, book status and support for BookLeaf Publishing authors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${grotesk.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
