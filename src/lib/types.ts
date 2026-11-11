export type Category = "Pulao" | "From the kitchen" | "Sides & sweets";

export type MenuItem = {
  id: string;
  name: string;
  nameUr?: string;
  description: string;
  descriptionUr?: string;
  category: Category;
  pricePaisa: number;
  image: string;
  imageAlt: string;
  badge: string | null;
  portion: string;
  available: boolean;
};

export type Storefront = {
  items: MenuItem[];
  mode: "preview" | "live" | "unavailable";
  orderingEnabled: boolean;
  deliveryAreas: string[];
  deliveryFeePaisa: number;
};

export type CartLine = { itemId: string; quantity: number };

export type OrderInput = {
  idempotencyKey: string;
  customerName: string;
  phone: string;
  fulfillment: "pickup" | "delivery";
  area?: string;
  address?: string;
  notes?: string;
  items: CartLine[];
  expectedTotalPaisa: number;
  paymentMethod?: "cod";
};

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";

export type OrderReceipt = {
  reference: string;
  totalPaisa: number;
  status: OrderStatus;
  paymentMethod?: "cod";
};
