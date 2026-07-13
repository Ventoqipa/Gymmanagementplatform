import type { PosRepository } from "./posRepository";
import type {
  CartLine,
  CheckoutInput,
  CreateProductInput,
  LinkedCustomer,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  PosTransactionType,
  SubscriptionCheckoutInput,
  UpdateProductInput,
} from "../domain/types";

export class PosService {
  constructor(private readonly repository: PosRepository) {}

  listProducts(params?: { search?: string; category?: string }) {
    return this.repository.listProducts(params);
  }

  createProduct(input: CreateProductInput) {
    return this.repository.createProduct(input);
  }

  updateProduct(id: string, input: UpdateProductInput) {
    return this.repository.updateProduct(id, input);
  }

  deleteProduct(id: string) {
    return this.repository.deleteProduct(id);
  }

  checkout(
    lines: CartLine[],
    paymentMethod: string,
    member?: LinkedCustomer,
    ivaRegimen?: CheckoutInput["ivaRegimen"],
    payer?: LinkedCustomer,
  ): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    const input: CheckoutInput = {
      lines,
      paymentMethod,
      member,
      payer,
      ivaRegimen: ivaRegimen ?? "sin_iva",
    };
    return this.repository.checkout(input);
  }

  listSales(params?: { from?: string; to?: string; type?: PosTransactionType }) {
    return this.repository.listSales(params);
  }

  listSalesToday() {
    return this.repository.listSalesToday();
  }

  checkoutSubscription(input: SubscriptionCheckoutInput) {
    return this.repository.checkoutSubscription(input);
  }
}
