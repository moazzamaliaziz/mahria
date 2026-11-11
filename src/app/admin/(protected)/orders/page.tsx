import type { Metadata } from "next";
import { AdminOrders } from "@/components/admin/admin-orders";
export const metadata: Metadata = { title: "Orders" };
export default function OrdersPage() {
  return <AdminOrders />;
}
