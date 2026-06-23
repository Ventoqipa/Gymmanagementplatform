import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  PosTransactionType,
  SubscriptionCheckoutInput,
  UpdateProductInput,
} from "../domain/types";
import type { PosRepository } from "../application/posRepository";

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
  checkoutSubscription(input: SubscriptionCheckoutInput): Promise<{ sale: PosSale }>;
  listSales(params?: {
    from?: string;
    to?: string;
    type?: PosTransactionType;
  }): Promise<PosSale[]>;
  listSalesToday(): Promise<PosSale[]>;
}
