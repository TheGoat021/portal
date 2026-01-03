import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthStore } from "@/store/authStore";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <body>
        <AuthProvider>
          <AuthStore>{children}</AuthStore>
        </AuthProvider>
      </body>
    </html>
  );
}
