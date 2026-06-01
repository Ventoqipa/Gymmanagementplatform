import { PosApiError } from "../api/posHttpClient";
import type { PosRepository } from "../application/posRepository";
import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  UpdateProductInput,
} from "../domain/types";
import type { RestPosRepository } from "./restPosRepository";
import type { MemoryPosRepository } from "./memoryPosRepository";

/**
 * Intenta REST (Neubox); en error de red o 5xx usa memoria local
 * para no bloquear operación en tienda.
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

  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    try {
      const remote = await this.remote.listProducts(params);
      return remote;
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

  async updateProduct(id: string, input: UpdateProductInput): Promise<PosProduct> {
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
      return this.local.checkout(input);
    }
  }

  async listSales(params?: { fromIso?: string; toIso?: string }): Promise<PosSale[]> {
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
