import type { Metadata } from "next";
import PrivacyContent from "./privacy-content";

export const metadata: Metadata = {
  title: "Privacy Information",
  description: "How this website handles your bag, language preference, cash-only orders and secure staff sessions.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
