import type { Metadata } from "next";
import { AdminHelp } from "@/components/admin/admin-help";
export const metadata: Metadata = { title: "Getting Started" };
export default function HelpPage() {
  return <AdminHelp />;
}
