import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Table Scene Studio",
  description: "웨이팅부터 주문, 결제, 고객 관리까지 연결하는 테이블씬 웹 올인원 솔루션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
