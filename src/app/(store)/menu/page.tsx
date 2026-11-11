import type { Metadata } from "next";
import MenuContent from "./menu-content";

export const metadata: Metadata = {
  title: "Our Menu",
  description:
    "Explore Mehria's chicken pulao, biryani, shami kabab, sides and zarda. Browse the reference menu and build your bag.",
};

export default function MenuPage() {
  return <MenuContent />;
}
