import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminOrders } from "@/components/admin/admin-orders";
export const metadata: Metadata = { title: "Read-Only Demo" };
export default function PreviewPage() {
  return (
    <AdminShell demo>
      <AdminOrders preview />
    </AdminShell>
  );
}
