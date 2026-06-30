import type { PosLabels } from "./types";

export const DEFAULT_STORAGE_PREFIX = "elite_gym_v1";

export const DEFAULT_PRODUCT_CATEGORIES: Record<string, string> = {
  ALL: "Todos",
  SUPPLEMENTS: "Suplementos",
  GEAR: "Ropa",
  ACCESSORIES: "Accesorios",
};

export const DEFAULT_PAYMENT_METHODS: Record<string, string> = {
  CARD: "Tarjeta",
  CASH: "Efectivo",
  QR: "QR",
};

export const DEFAULT_LABELS: PosLabels = {
  title: "Tienda",
  searchPlaceholder: "Buscar por código o nombre...",
  addProduct: "Agregar producto",
  cartTitle: "Carrito de compras",
  emptyCart: "El carrito está vacío",
  total: "Total",
  currencySuffix: "MXN",
  paymentMethod: "Método de pago",
  checkout: "Completar venta",
  linkedCustomerHint: "Cliente traído desde Miembros",
  saleCustomerTitle: "Cliente de la venta",
  customerDropdownPlaceholder: "Cliente de la venta",
  selectedMemberLabel: "Asociado a esta venta",
  selectMemberButton: "Asignar cliente",
  changeMemberButton: "Cambiar cliente",
  searchMemberPlaceholder: "Buscar por nombre o ID...",
  noMemberSelected: "Sin cliente asignado — la venta no quedará vinculada a un miembro",
  clearMember: "Quitar",
  membersLoading: "Cargando miembros…",
  noMembersFound: "No hay miembros que coincidan",
  inventory: "Inventario",
  newProduct: "Nuevo producto",
  editProduct: "Editar producto",
  productName: "Nombre",
  category: "Categoría",
  price: "Precio ($)",
  stock: "Stock",
  generatedCode: "Código generado",
  cancel: "Cancelar",
  saveChanges: "Guardar cambios",
  deleteConfirm: (name) =>
    `¿Eliminar "${name}"? Se quitará de la lista y del carrito si está agregado.`,
  ticketBrand: "Elite Gym 24/7",
  ticketClient: "Cliente",
  ticketClose: "Cerrar",
  ticketPayment: "Pago",
  ticketFooter: "Montos en pesos mexicanos (MXN).",
  stockLabel: "Existencia",
  editStockHint:
    "El código no se modifica al editar. Si reduces el stock por debajo de lo que hay en el carrito, la cantidad se ajusta o se quita la línea.",
  productCategories: DEFAULT_PRODUCT_CATEGORIES,
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  categoryFilterIds: ["ALL", "SUPPLEMENTS", "GEAR", "ACCESSORIES"],
  productCategoryOptions: [
    { value: "SUPPLEMENTS", label: "Suplementos" },
    { value: "GEAR", label: "Ropa" },
    { value: "ACCESSORIES", label: "Accesorios" },
  ],
  paymentMethodOptions: [
    { id: "CARD", label: "Tarjeta" },
    { id: "CASH", label: "Efectivo" },
    { id: "QR", label: "QR Code" },
  ],
};
