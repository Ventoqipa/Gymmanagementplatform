import { posConfig } from "../config";
import { posDelete, posGet, posPost, posPut } from "../api/posHttpClient";
import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  UpdateProductInput,
} from "../domain/types";
import type { PosRepository } from "../application/posRepository";

type CheckoutApiResponse = {
  sale: PosSale;
  receipt: PosTicketReceipt;
  products?: PosProduct[];
};

export class RestPosRepository implements PosRepository {
  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    const query: Record<string, string> = {};
    if (params?.search) query.search = params.search;
    if (params?.category && params.category !== "ALL") {
      query.category = params.category;
    }
    return posGet<PosProduct[]>("/products", query);
  }

  async createProduct(input: CreateProductInput): Promise<PosProduct> {
    return posPost<PosProduct>("/products", {
      ...input,
      tenantId: posConfig.tenantId,
      branchId: posConfig.branchId,
    });
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<PosProduct> {
    return posPut<PosProduct>(`/products/${encodeURIComponent(id)}`, input);
  }

  async deleteProduct(id: string): Promise<void> {
    await posDelete(`/products/${encodeURIComponent(id)}`);
  }

  async checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    const result = await posPost<CheckoutApiResponse>("/sales/checkout", {
      lines: input.lines.map((l) => ({
        productId: l.id,
        quantity: l.quantity,
        unitPrice: l.price,
      })),
      paymentMethod: input.paymentMethod,
      ivaRegimen: input.ivaRegimen,
      memberId: input.member?.id,
      memberName: input.member?.name,
      tenantId: posConfig.tenantId,
      branchId: input.branchId ?? posConfig.branchId,
    });

    const products =
      result.products ?? (await this.listProducts());

    return {
      sale: result.sale,
      receipt: result.receipt,
      products,
    };
  }

  async listSales(params?: { fromIso?: string; toIso?: string }): Promise<PosSale[]> {
    const query: Record<string, string> = {};
    if (params?.fromIso) query.from = params.fromIso;
    if (params?.toIso) query.to = params.toIso;
    return posGet<PosSale[]>("/sales", query);
  }

  async listSalesToday(): Promise<PosSale[]> {
    return posGet<PosSale[]>("/sales/today");
  }
}
