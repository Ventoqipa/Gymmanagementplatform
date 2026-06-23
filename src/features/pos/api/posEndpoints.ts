/** Rutas del POS API — ver POSAPIGateway/docs/swagger.json */

export const POS_API_PATHS = {
  health: "/health",
  products: "/products",
  product: (id: string) => `/products/${encodeURIComponent(id)}`,
  /** POST — IIS/Neubox no permite DELETE */
  productDelete: (id: string) =>
    `/products/${encodeURIComponent(id)}/delete`,
  salesCheckout: "/sales/checkout",
  salesSubscription: "/sales/subscription",
  sales: "/sales",
  salesToday: "/sales/today",
} as const;
