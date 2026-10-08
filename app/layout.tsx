import type {
  Metadata,
} from "next";

import Providers from "./provider";

export const metadata: Metadata = {
  title:
    "PR Prospecting Dashboard",

  description:
    "Health 2.0 and Education 2.0 prospect discovery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}