import type { Metadata } from "next";
import FaqContent from "./faq-content";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about Mehria's cash-only website orders, pickup, delivery availability, published hours, preview prices and allergy enquiries.",
};

export default function FaqPage() {
  return <FaqContent />;
}
