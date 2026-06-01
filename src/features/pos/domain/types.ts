export type PosProductCategory = "SUPPLEMENTS" | "GEAR" | "ACCESSORIES";

export type PosProduct = {
  id: string;
  name: string;
  category: PosProductCategory | string;
  price: number;
  stock: number;
};

export type PosCartLine = PosProduct & {
  quantity: number;
};

export type IvaRegimen = "general" | "frontera";

export type PosPaymentMethod = "CARD" | "CASH" | "QR";

export type PosSaleLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PosSale = {
  id: string;
  total: number;
  subtotal: number;
  tax: number;
  method: PosPaymentMethod | string;
  dateIso: string;
  linesSummary: string;
  memberId?: string;
  memberName?: string;
  ivaRegimen: IvaRegimen;
  ivaRate: number;
  lines?: PosSaleLine[];
};

export type PosTicketReceipt = {
  id: string;
  lines: {
    name: string;
    id: string;
    qty: number;
    unit: number;
    lineTotal: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  member?: { id?: string; name?: string };
  createdIso: string;
  ivaRegimen: IvaRegimen;
  ivaRate: number;
  ivaLabelShort: string;
};

export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  stock: number;
  id?: string;
};

export type UpdateProductInput = {
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type CheckoutInput = {
  lines: PosCartLine[];
  paymentMethod: PosPaymentMethod;
  ivaRegimen: IvaRegimen;
  member?: { id?: string; name?: string };
  branchId?: number;
  tenantId?: string;
};

export type PosLinkedMember = {
  memberId?: string;
  memberName?: string;
};

/** Respuesta estándar Tanosi (opcional en el API POS). */
export type TanosiPosEnvelope<T> = {
  statusCode: number;
  messageTechnical: string;
  messageUser: string;
  errorNumber: number;
  data: T;
  isResponseSuccessful: boolean;
};
