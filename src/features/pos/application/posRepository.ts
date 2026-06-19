import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  UpdateProductInput,
} from "../domain/types";

export interface PosRepository {
  listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]>;
  createProduct(input: CreateProductInput): Promise<PosProduct>;
  updateProduct(id: string, input: UpdateProductInput): Promise<PosProduct>;
  deleteProduct(id: string): Promise<void>;
  checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }>;
  listSales(params?: { fromIso?: string; toIso?: string }): Promise<PosSale[]>;
  listSalesToday(): Promise<PosSale[]>;
}
