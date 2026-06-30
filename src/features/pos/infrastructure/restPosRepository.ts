import { POS_API_PATHS } from "../api/posEndpoints";
import { posDelete, posGet, posPost, posPut } from "../api/posHttpClient";
import type { PosConfig } from "../config/types";
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
import { filterSalesByType, normalizePosSale, resolveTransactionType } from "../domain/filterSales";
import {
  buildSubscriptionReceipt,
  ticketIdFromSaleId,
} from "../domain/subscriptionReceipt";
import {
  localDayEndUtcIso,
  localDayStartUtcIso,
} from "@/app/lib/labels";
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
      sale: normalizePosSale(result.sale),
      receipt: result.receipt,
      products,
    };
  }

  async checkoutSubscription(
    input: SubscriptionCheckoutInput,
  ): Promise<{ sale: PosSale; receipt: PosTicketReceipt }> {
    const result = await posPost<{
      sale: PosSale;
      receipt?: PosTicketReceipt;
    }>(
      this.config,
      POS_API_PATHS.salesSubscription,
      {
        memberId: input.memberId,
        memberName: input.memberName,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        concept: input.concept ?? "MEMBERSHIP",
        periodKey: input.periodKey,
        payerId: input.payerId,
        payerName: input.payerName,
      },
    );
    const sale = normalizePosSale(result.sale);
    const receipt =
      result.receipt ??
      buildSubscriptionReceipt(
        input,
        ticketIdFromSaleId(sale.id),
        sale.dateIso,
      );
    return { sale, receipt };
  }

  async listSales(params?: {
    from?: string;
    to?: string;
    type?: PosTransactionType;
  }): Promise<PosSale[]> {
    const query: Record<string, string> = {};
    if (params?.from) query.from = localDayStartUtcIso(params.from);
    if (params?.to) query.to = localDayEndUtcIso(params.to);
    if (params?.type) query.type = params.type;
    const rows = await posGet<PosSale[]>(this.config, POS_API_PATHS.sales, query);
    return rows.map(normalizePosSale).filter((sale) => {
      if (!params?.type) return true;
      return resolveTransactionType(sale) === params.type;
    });
  }

  async listSalesToday(): Promise<PosSale[]> {
    const rows = await posGet<PosSale[]>(this.config, POS_API_PATHS.salesToday);
    return rows.map(normalizePosSale);
  }

  healthCheck(): Promise<void> {
    return posGet<unknown>(this.config, POS_API_PATHS.health).then(() => undefined);
  }
}
