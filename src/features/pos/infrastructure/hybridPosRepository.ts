import { PosApiError } from "../api/posHttpClient";
import type { PosRepository } from "../application/posRepository";
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
import type { MemoryPosRepository } from "./memoryPosRepository";
import type { RestPosRepository } from "./restPosRepository";

// NUEVO: cobros con terminal Mercado Pago; necesitan el POS API (no hay respaldo local)
const TERMINAL_METHODS = ["CARD", "TERMINAL_MP"];

const isTerminalMethod = (method?: string | null): boolean =>
  TERMINAL_METHODS.includes(String(method ?? "").toUpperCase());

/**
 * Intenta REST (Neubox); en error de red o 5xx usa memoria local
 * para no bloquear operación en tienda.
 * Excepción: los cobros con tarjeta nunca usan memoria local.
 */
export class HybridPosRepository implements PosRepository {
  constructor(
    private readonly remote: RestPosRepository,
    private readonly local: MemoryPosRepository,
  ) {}

  private shouldFallback(error: unknown): boolean {
    if (error instanceof PosApiError) {
      return error.statusCode === 0 || error.statusCode >= 500;
    }
    return true;
  }

  /** NUEVO: error claro cuando un cobro con tarjeta no llega al servidor */
  private terminalUnavailable(error: unknown): PosApiError {
    const statusCode = error instanceof PosApiError ? error.statusCode : 0;
    return new PosApiError(
      "Sin conexión con el servidor: el cobro con tarjeta necesita conexión. Reintenta o cobra en efectivo.",
      statusCode,
    );
  }

  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    try {
      return await this.remote.listProducts(params);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      return this.local.listProducts(params);
    }
  }

  async createProduct(input: CreateProductInput): Promise<PosProduct> {
    try {
      return await this.remote.createProduct(input);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      return this.local.createProduct(input);
    }
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<PosProduct> {
    try {
      return await this.remote.updateProduct(id, input);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      return this.local.updateProduct(id, input);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await this.remote.deleteProduct(id);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      await this.local.deleteProduct(id);
    }
  }

  async checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    try {
      return await this.remote.checkout(input);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      // NUEVO: una venta con tarjeta no puede quedar solo en memoria
      if (isTerminalMethod(input.paymentMethod)) throw this.terminalUnavailable(error);
      return this.local.checkout(input);
    }
  }

  async checkoutSubscription(
    input: SubscriptionCheckoutInput,
  ): Promise<{ sale: PosSale; receipt: PosTicketReceipt }> {
    try {
      return await this.remote.checkoutSubscription(input);
    } catch (error) {
      const canFallback =
        (error instanceof PosApiError &&
          (error.statusCode === 404 || error.statusCode === 0 || error.statusCode >= 500)) ||
        this.shouldFallback(error);
      if (!canFallback) throw error;
      // NUEVO: una renovación con tarjeta sin servidor daría vigencia sin cobrar
      if (isTerminalMethod(input.paymentMethod)) throw this.terminalUnavailable(error);
      return this.local.checkoutSubscription(input);
    }
  }

  // NUEVO: solo remoto; si falla, Members.tsx lo reintenta
  async markSubscriptionApplied(saleId: string): Promise<void> {
    await this.remote.markSubscriptionApplied(saleId);
  }

  async listSales(params?: {
    from?: string;
    to?: string;
    type?: PosTransactionType;
  }): Promise<PosSale[]> {
    try {
      return await this.remote.listSales(params);
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      return this.local.listSales(params);
    }
  }

  async listSalesToday(): Promise<PosSale[]> {
    try {
      return await this.remote.listSalesToday();
    } catch (error) {
      if (!this.shouldFallback(error)) throw error;
      return this.local.listSalesToday();
    }
  }
}
