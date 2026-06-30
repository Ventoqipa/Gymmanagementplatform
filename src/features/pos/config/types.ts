export type PosNotifyAdapter = {
  success: (message: string, options?: { description?: string }) => void;
  error: (message: string) => void;
  info: (message: string, options?: { description?: string }) => void;
};

export type PosLabels = {
  title: string;
  searchPlaceholder: string;
  addProduct: string;
  cartTitle: string;
  emptyCart: string;
  total: string;
  currencySuffix: string;
  paymentMethod: string;
  checkout: string;
  linkedCustomerHint: string;
  saleCustomerTitle: string;
  customerDropdownPlaceholder: string;
  selectedMemberLabel: string;
  selectMemberButton: string;
  changeMemberButton: string;
  searchMemberPlaceholder: string;
  noMemberSelected: string;
  clearMember: string;
  membersLoading: string;
  noMembersFound: string;
  inventory: string;
  newProduct: string;
  editProduct: string;
  productName: string;
  category: string;
  price: string;
  stock: string;
  generatedCode: string;
  cancel: string;
  saveChanges: string;
  deleteConfirm: (name: string) => string;
  ticketBrand: string;
  ticketClient: string;
  ticketClose: string;
  ticketPayment: string;
  ticketFooter: string;
  stockLabel: string;
  editStockHint: string;
  productCategories: Record<string, string>;
  paymentMethods: Record<string, string>;
  categoryFilterIds: string[];
  productCategoryOptions: { value: string; label: string }[];
  paymentMethodOptions: { id: string; label: string }[];
};

export type PosStorageKeys = {
  products: string;
  sales: string;
};

export type PosDataSource = "local" | "rest" | "hybrid";

export type PosConfig = {
  storagePrefix: string;
  storageKeys: PosStorageKeys;
  labels: PosLabels;
  notify: PosNotifyAdapter;
  defaultProductCategory: string;
  showTaxOnTicket: boolean;
  ivaRegimen: "general" | "exento" | "sin_iva";
  apiBaseUrl: string;
  apiPrefix: string;
  /** API key del POS API (header X-Api-Key) */
  apiKey?: string;
  tenantId: string;
  branchId: number;
  /** Origen de datos: local | REST POS API | híbrido con fallback local */
  dataSource: PosDataSource;
  /** true = solo localStorage; false = según dataSource */
  useMock: boolean;
  /** Fallback si no hay apiKey (Bearer) */
  getAuthToken?: () => string | null;
  onSaleComplete?: (sale: import("../domain/types").PosSale) => void;
  confirmDelete?: (message: string) => boolean;
  /** Directorio de miembros para asociar ventas en tienda. */
  loadCustomers?: () => Promise<import("../domain/types").LinkedCustomer[]>;
};

export type PosConfigInput = Partial<
  Omit<PosConfig, "labels" | "storageKeys" | "notify">
> & {
  labels?: Partial<PosLabels>;
  storageKeys?: Partial<PosStorageKeys>;
  notify?: Partial<PosNotifyAdapter>;
};
