import type { Metadata } from "next";
import ContactContent from "./contact-content";

export const metadata: Metadata = {
  title: "Contact & Find Us",
  description: "Published phone, location and hours for Mehria Murgh Pulao, G-11 Markaz, Islamabad. Call to confirm availability or get directions.",
};

export default function ContactPage() {
  return <ContactContent />;
}
