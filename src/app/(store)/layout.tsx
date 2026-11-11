import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ShopProvider } from "@/components/shop-provider";
import { getStorefront } from "@/lib/storefront";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const storefront = await getStorefront();
  return <ShopProvider storefront={storefront}><Header />{children}<Footer /></ShopProvider>;
}
