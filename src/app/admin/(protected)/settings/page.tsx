import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin/admin-settings";
export const metadata: Metadata = { title: "Store Settings" };
export default function SettingsPage() {
  return <AdminSettings />;
}
