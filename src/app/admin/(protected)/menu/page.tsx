import type { Metadata } from "next";
import { AdminMenu } from "@/components/admin/admin-menu";
export const metadata: Metadata = { title: "Menu Manager" };
export default function MenuPage() {
  return <AdminMenu />;
}
