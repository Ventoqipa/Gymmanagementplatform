/** Tipos del dominio POS — portables entre proyectos. */

export type IvaRegimen = "general" | "exento" | "sin_iva";

export type PosProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
};

export type CartLine = PosProduct & {
  quantity: number;
};

export type LinkedCustomer = {
  id?: string;
  name?: string;
};

export type PosTicketLine = {
  name: string;
  id: string;
  qty: number;
  unit: number;
  lineTotal: number;
};

export type PosTicketReceipt = {
  id: string;
  lines: PosTicketLine[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  member?: LinkedCustomer;
  payer?: LinkedCustomer;
  createdIso: string;
  ivaRegimen: IvaRegimen;
  ivaRate: number;
  ivaLabelShort: string;
};

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
  method: string;
  dateIso: string;
  linesSummary: string;
  memberId?: string;
  memberName?: string;
  payerId?: string;
  payerName?: string;
  ivaRegimen: IvaRegimen;
  ivaRate: number;
  lines?: PosSaleLine[];
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
  lines: CartLine[];
  paymentMethod: string;
  member?: LinkedCustomer;
  payer?: LinkedCustomer;
  ivaRegimen?: IvaRegimen;
};

export type TanosiPosEnvelope<T = unknown> = {
  isResponseSuccessful: boolean;
  status: number;
  message: string | null;
  statusCode: number;
  messageTechnical: string | null;
  messageUser: string | null;
  errorNumber: number;
  data: T;
};

export type ProductFormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
};
