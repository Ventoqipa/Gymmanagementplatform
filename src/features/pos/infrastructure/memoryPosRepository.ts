import { buildSubscriptionReceipt } from "../domain/subscriptionReceipt";
import { calcTotals, IVA_REGIMEN_LABEL } from "../domain/tax";
import { filterSalesByType } from "../domain/filterSales";
import { generateProductSku } from "../domain/productId";
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
import { todayIso } from "@/app/lib/labels";
import type { PosRepository } from "../application/posRepository";
import type { LocalPosStorage } from "./localPosStorage";

function filterProducts(
  list: PosProduct[],
  params?: { search?: string; category?: string },
): PosProduct[] {
  const search = params?.search?.trim().toLowerCase() ?? "";
  const category = params?.category?.trim() ?? "";
  return list.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search) ||
      p.id.toLowerCase().includes(search);
    const matchesCategory =
      !category || category === "ALL" || p.category === category;
    return matchesSearch && matchesCategory;
  });
}

function buildReceipt(
  input: CheckoutInput,
  ticketId: string,
): { receipt: PosTicketReceipt; sale: PosSale } {
  const regimen = input.ivaRegimen ?? "sin_iva";
  const { subtotal, tax, total, ivaRate } = calcTotals(input.lines, regimen);
  const receipt: PosTicketReceipt = {
    id: ticketId,
    lines: input.lines.map((c) => ({
      name: c.name,
      id: c.id,
      qty: c.quantity,
      unit: c.price,
      lineTotal: c.price * c.quantity,
    })),
    subtotal,
    tax,
    total,
    paymentMethod: input.paymentMethod,
    member: input.member,
    createdIso: new Date().toISOString(),
    ivaRegimen: regimen,
    ivaRate,
    ivaLabelShort: IVA_REGIMEN_LABEL[regimen],
  };

  const sale: PosSale = {
    id: ticketId.replace("TKT-", "POS-"),
    transactionType: "product",
    total,
    subtotal,
    tax,
    method: input.paymentMethod,
    dateIso: receipt.createdIso,
    linesSummary: receipt.lines.map((l) => `${l.qty}× ${l.name}`).join(" · "),
    memberId: input.member?.id,
    memberName: input.member?.name,
    ivaRegimen: regimen,
    ivaRate,
    lines: input.lines.map((c) => ({
      productId: c.id,
      name: c.name,
      quantity: c.quantity,
      unitPrice: c.price,
      lineTotal: c.price * c.quantity,
    })),
  };

  return { receipt, sale };
}

export class MemoryPosRepository implements PosRepository {
  private products: PosProduct[];
  private sales: PosSale[];

  constructor(private readonly storage: LocalPosStorage) {
    this.products = storage.loadProducts();
    this.sales = storage.loadSales();
  }

  private persistProducts() {
    this.storage.saveProducts(this.products);
  }

  private persistSales() {
    this.storage.saveSales(this.sales);
  }

  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    return filterProducts([...this.products], params);
  }

  async createProduct(input: CreateProductInput): Promise<PosProduct> {
    const id =
      input.id?.trim() || generateProductSku(input.category, this.products);
    const product: PosProduct = {
      id,
      name: input.name.trim().toUpperCase(),
      category: input.category,
      price: input.price,
      stock: input.stock,
    };
    this.products = [...this.products, product];
    this.persistProducts();
    return product;
  }

  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<PosProduct> {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Producto no encontrado.");
    const updated: PosProduct = {
      id,
      name: input.name.trim().toUpperCase(),
      category: input.category,
      price: input.price,
      stock: input.stock,
    };
    this.products = this.products.map((p, i) => (i === idx ? updated : p));
    this.persistProducts();
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter((p) => p.id !== id);
    this.persistProducts();
  }

  async checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const { receipt, sale } = buildReceipt(input, ticketId);

    this.products = this.products.map((p) => {
      const line = input.lines.find((c) => c.id === p.id);
      if (!line) return p;
      return { ...p, stock: Math.max(0, p.stock - line.quantity) };
    });

    this.sales = [sale, ...this.sales];
    this.persistProducts();
    this.persistSales();
    return { sale, receipt, products: [...this.products] };
  }

  async checkoutSubscription(
    input: SubscriptionCheckoutInput,
  ): Promise<{ sale: PosSale; receipt: PosTicketReceipt }> {
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const concept = input.concept ?? "MEMBERSHIP";
    const periodSuffix = input.periodKey ? ` · ${input.periodKey}` : "";
    const linesSummary = `Suscripción · ${concept}${periodSuffix}${
      input.memberName ? ` · ${input.memberName}` : ""
    }`;
    const dateIso = new Date().toISOString();
    const receipt = buildSubscriptionReceipt(input, ticketId, dateIso);
    const sale: PosSale = {
      id: ticketId.replace("TKT-", "POS-"),
      transactionType: "subscription",
      total: input.amount,
      subtotal: input.amount,
      tax: 0,
      method: input.paymentMethod,
      dateIso,
      linesSummary,
      memberId: input.memberId,
      memberName: input.memberName,
      payerId: input.payerId,
      payerName: input.payerName,
      ivaRegimen: "sin_iva",
      ivaRate: 0,
      subscriptionConcept: concept,
      periodKey: input.periodKey,
      lines: [],
    };
    this.sales = [sale, ...this.sales];
    this.persistSales();
    return { sale, receipt };
  }

  async listSales(params?: {
    from?: string;
    to?: string;
    type?: PosTransactionType;
  }): Promise<PosSale[]> {
    let list = [...this.sales];
    if (params?.type) {
      list = filterSalesByType(list, params.type);
    }
    if (params?.from) {
      const from = new Date(`${params.from}T00:00:00`).getTime();
      list = list.filter((s) => new Date(s.dateIso).getTime() >= from);
    }
    if (params?.to) {
      const to = new Date(`${params.to}T23:59:59.999`).getTime();
      list = list.filter((s) => new Date(s.dateIso).getTime() <= to);
    }
    return list.sort(
      (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
    );
  }

  async listSalesToday(): Promise<PosSale[]> {
    const today = todayIso();
    return this.listSales({ from: today, to: today });
  }
}

export function createMemoryPosRepository(
  storage: LocalPosStorage,
): MemoryPosRepository {
  return new MemoryPosRepository(storage);
}

/** Instancia legacy compartida (mismas claves elite_gym_v1). */
import { createLocalPosStorage } from "./localPosStorage";

export const sharedMemoryPosRepository = createMemoryPosRepository(
  createLocalPosStorage({
    products: "elite_gym_v1_pos_products",
    sales: "elite_gym_v1_pos_sales",
  }),
);
