import type { MenuItem, OrderStatus } from "./types";

export type AdminIdentity = { id: string; name: string; email: string };
export type AdminSessionData = {
  admin: AdminIdentity;
  csrfToken: string;
  expiresAt: string;
};
export type AdminOrder = {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  fulfillment: "pickup" | "delivery";
  area: string | null;
  address: string | null;
  notes: string | null;
  status: OrderStatus;
  paymentMethod: "cod";
  paymentStatus: "unpaid" | "collected";
  subtotalPaisa: number;
  deliveryFeePaisa: number;
  totalPaisa: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    unitPricePaisa: number;
    lineTotalPaisa: number;
  }[];
};
export type AdminOrdersData = {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    newCount: number;
    activeCount: number;
    todayCount: number;
    todayRevenuePaisa: number;
  };
  generatedAt: string;
};
export type AdminMenuItem = MenuItem & {
  approved: boolean;
  version: number;
  nameUr: string;
  descriptionUr: string;
};
export type StoreSettings = {
  orderingEnabled: boolean;
  deliveryAreas: string[];
  deliveryFeePaisa: number;
  version: number;
};
