/**
 * Módulo POS reutilizable — Elite Gym y otros proyectos Tanosi.
 *
 * @example
 * import { PosTerminal, posService, getPosSalesToday } from "@/features/pos";
 */

export { posConfig, getPosApiUrl } from "./config";

export type {
  PosProduct,
  PosSale,
  PosCartLine,
  PosTicketReceipt,
  PosPaymentMethod,
  PosLinkedMember,
  IvaRegimen,
  CheckoutInput,
} from "./domain/types";

export { IVA_REGIMEN_LABEL, getIvaRate, calcTotals } from "./domain/tax";
export { generateProductSku } from "./domain/productId";

export { posService, PosService } from "./application/posService";
export type { PosRepository } from "./application/posRepository";

export { PosTerminal } from "./ui/PosTerminal";
export type { PosTerminalProps } from "./ui/PosTerminal";

export { createPosRepository } from "./infrastructure/createPosRepository";

import { posService } from "./application/posService";

/** Compatibilidad con reportes y demoStore legado. */
export async function getPosSalesToday() {
  return posService.listSalesToday();
}

export async function getPosSales() {
  return posService.listSales();
}

export type PosSaleSummary = {
  id: string;
  total: number;
  method: string;
  dateIso: string;
  memberId?: string;
  memberName?: string;
  linesSummary: string;
};

/** Mapeo ligero para UI de reportes que esperaba el tipo antiguo. */
export function toLegacyPosSale(sale: import("./domain/types").PosSale): PosSaleSummary {
  return {
    id: sale.id,
    total: sale.total,
    method: sale.method,
    dateIso: sale.dateIso,
    memberId: sale.memberId,
    memberName: sale.memberName,
    linesSummary: sale.linesSummary,
  };
}
