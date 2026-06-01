import { calcTotals, IVA_REGIMEN_LABEL } from "../domain/tax";
import { generateProductSku } from "../domain/productId";
import type {
  CheckoutInput,
  CreateProductInput,
  PosProduct,
  PosSale,
  PosTicketReceipt,
  UpdateProductInput,
} from "../domain/types";
import type { PosRepository } from "../application/posRepository";
import { POS_SEED_PRODUCTS } from "./seedProducts";

let products: PosProduct[] = POS_SEED_PRODUCTS.map((p) => ({ ...p }));
let sales: PosSale[] = [
  {
    id: "POS-DEMO-1",
    total: 64.98,
    subtotal: 56.02,
    tax: 8.96,
    method: "CARD",
    dateIso: new Date().toISOString(),
    linesSummary: "ISO WHEY + SHAKER",
    ivaRegimen: "general",
    ivaRate: 0.16,
  },
  {
    id: "POS-DEMO-2",
    total: 32.99,
    subtotal: 28.44,
    tax: 4.55,
    method: "QR",
    dateIso: new Date(Date.now() - 3600000).toISOString(),
    linesSummary: "PRE-WORKOUT RAGE",
    ivaRegimen: "general",
    ivaRate: 0.16,
  },
];

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
  const { subtotal, tax, total, ivaRate } = calcTotals(input.lines, input.ivaRegimen);
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
    ivaRegimen: input.ivaRegimen,
    ivaRate,
    ivaLabelShort: IVA_REGIMEN_LABEL[input.ivaRegimen],
  };

  const sale: PosSale = {
    id: ticketId.replace("TKT-", "POS-"),
    total,
    subtotal,
    tax,
    method: input.paymentMethod,
    dateIso: receipt.createdIso,
    linesSummary: receipt.lines.map((l) => `${l.qty}× ${l.name}`).join(" · "),
    memberId: input.member?.id,
    memberName: input.member?.name,
    ivaRegimen: input.ivaRegimen,
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
  async listProducts(params?: {
    search?: string;
    category?: string;
  }): Promise<PosProduct[]> {
    return filterProducts([...products], params);
  }

  async createProduct(input: CreateProductInput): Promise<PosProduct> {
    const id =
      input.id?.trim() ||
      generateProductSku(input.category, products);
    const product: PosProduct = {
      id,
      name: input.name.trim().toUpperCase(),
      category: input.category,
      price: input.price,
      stock: input.stock,
    };
    products = [...products, product];
    return product;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<PosProduct> {
    const idx = products.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error("Producto no encontrado.");
    const updated: PosProduct = {
      id,
      name: input.name.trim().toUpperCase(),
      category: input.category,
      price: input.price,
      stock: input.stock,
    };
    products = products.map((p, i) => (i === idx ? updated : p));
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    products = products.filter((p) => p.id !== id);
  }

  async checkout(input: CheckoutInput): Promise<{
    sale: PosSale;
    receipt: PosTicketReceipt;
    products: PosProduct[];
  }> {
    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;
    const { receipt, sale } = buildReceipt(input, ticketId);

    products = products.map((p) => {
      const line = input.lines.find((c) => c.id === p.id);
      if (!line) return p;
      return { ...p, stock: Math.max(0, p.stock - line.quantity) };
    });

    sales = [sale, ...sales];
    return { sale, receipt, products: [...products] };
  }

  async listSales(params?: { fromIso?: string; toIso?: string }): Promise<PosSale[]> {
    let list = [...sales];
    if (params?.fromIso) {
      const from = new Date(params.fromIso).getTime();
      list = list.filter((s) => new Date(s.dateIso).getTime() >= from);
    }
    if (params?.toIso) {
      const to = new Date(params.toIso).getTime();
      list = list.filter((s) => new Date(s.dateIso).getTime() <= to);
    }
    return list.sort(
      (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
    );
  }

  async listSalesToday(): Promise<PosSale[]> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.listSales({ fromIso: start.toISOString() });
  }
}

/** Instancia compartida para fallback y modo mock. */
export const sharedMemoryPosRepository = new MemoryPosRepository();
