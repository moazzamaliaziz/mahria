import type { Metadata } from "next";
import "./admin.css";
import { AdminPwa } from "@/components/admin/admin-pwa";

export const metadata: Metadata = {
  title: {
    default: "Kitchen Manager | Mehria",
    template: "%s | Mehria Kitchen",
  },
  robots: { index: false, follow: false, nocache: true },
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mehria Kitchen",
    statusBarStyle: "default",
  },
  icons: { apple: "/admin/icons/icon-192.png" },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      {children}
      <div className="admin-pwa-footer">
        <AdminPwa />
      </div>
    </div>
  );
}
