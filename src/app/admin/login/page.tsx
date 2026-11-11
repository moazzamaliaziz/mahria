import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminLogin } from "@/components/admin/admin-login";
export const metadata: Metadata = { title: "Staff Sign In" };
export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin/orders");
  return <AdminLogin />;
}
