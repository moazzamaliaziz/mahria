import type { Metadata } from "next";
import PreviewContent from "./preview-content";

export const metadata: Metadata = {
  title: "Preview & Sources",
  description: "Published business sources, menu reference prices, photography permissions and launch limitations for this proposed Mehria website.",
  robots: { index: false, follow: false },
};

export default function PreviewPage() {
  return <PreviewContent />;
}
