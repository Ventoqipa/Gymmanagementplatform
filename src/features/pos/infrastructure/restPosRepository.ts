import { POS_API_PATHS } from "../api/posEndpoints";
import { posDelete, posGet, posPost, posPut } from "../api/posHttpClient";
import type { PosConfig } from "../config/types";
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
  constructor(private readonly config: PosConfig) {}

  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    const query: Record<string, string> = {};
    if (params?.search) query.search = params.search;
    if (params?.category && params.category !== "ALL") {
      query.category = params.category;
    }
    return posGet<PosProduct[]>(this.config, POS_API_PATHS.products, query);
  }

  async createProduct(input: CreateProductInput): Promise<PosProduct> {
    const body: Record<string, unknown> = {
      name: input.name,
      category: input.category,
      price: input.price,
      stock: input.stock,
    };
    if (input.id) body.id = input.id;
    return posPost<PosProduct>(this.config, POS_API_PATHS.products, body);
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<PosProduct> {
    return posPut<PosProduct>(
      this.config,
      POS_API_PATHS.product(id),
      input,
    );
  }

  async deleteProduct(id: string): Promise<void> {
    await posDelete(this.config, POS_API_PATHS.productDelete(id));
  }

  async checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    const result = await posPost<CheckoutApiResponse>(
      this.config,
      POS_API_PATHS.salesCheckout,
      {
        lines: input.lines.map((l) => ({
          productId: l.id,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
        paymentMethod: input.paymentMethod,
        ivaRegimen: input.ivaRegimen ?? this.config.ivaRegimen,
        memberId: input.member?.id,
        memberName: input.member?.name,
        payerId: input.payer?.id,
        payerName: input.payer?.name,
      },
    );

    const products =
      result.products ?? (await this.listProducts());

    return {
      sale: result.sale,
      receipt: result.receipt,
      products,
    };
  }

  async listSales(params?: {
    fromIso?: string;
    toIso?: string;
  }): Promise<PosSale[]> {
    const query: Record<string, string> = {};
    if (params?.fromIso) query.from = params.fromIso;
    if (params?.toIso) query.to = params.toIso;
    return posGet<PosSale[]>(this.config, POS_API_PATHS.sales, query);
  }

  async listSalesToday(): Promise<PosSale[]> {
    return posGet<PosSale[]>(this.config, POS_API_PATHS.salesToday);
  }

  healthCheck(): Promise<void> {
    return posGet<unknown>(this.config, POS_API_PATHS.health).then(() => undefined);
  }
}
