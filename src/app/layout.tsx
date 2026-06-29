import type { Metadata } from "next";
import "@/app/globals.css";
import { APP_NAME } from "@/lib/constants";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "CRM financeiro privado para organização pessoal e profissional."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
