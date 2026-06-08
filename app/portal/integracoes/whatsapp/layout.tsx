import type { ReactNode } from "react";

import { WhatsAppConfigSubmenu } from "@/components/WhatsAppConfigSubmenu";

export default function WhatsAppConfigLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <WhatsAppConfigSubmenu />
      {children}
    </div>
  );
}
