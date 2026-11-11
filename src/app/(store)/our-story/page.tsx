import type { Metadata } from "next";
import StoryContent from "./story-content";

export const metadata: Metadata = {
  title: "Our Story",
  description: "A closer look at Mehria Murgh Pulao in G-11 Markaz, Islamabad, its published menu and familiar Pakistani flavours.",
};

export default function StoryPage() {
  return <StoryContent />;
}
