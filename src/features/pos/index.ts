/** API pública del módulo POS — plug & play. */

export { PosProvider, usePosContext } from "./ui/PosProvider";
export type { PosProviderProps } from "./ui/PosProvider";
export { PosTerminal } from "./ui/PosTerminal";
export { PosTicketModal } from "./ui/PosTicketModal";
export { usePosTerminal } from "./hooks/usePosTerminal";

export { createPosConfig, eliteGymPosConfig } from "./config/createPosConfig";
export type {
  PosConfig,
  PosConfigInput,
  PosDataSource,
  PosLabels,
  PosNotifyAdapter,
} from "./config/types";
export { DEFAULT_LABELS, DEFAULT_STORAGE_PREFIX } from "./config/defaults";

export type {
  PosProduct,
  PosSale,
  PosTicketReceipt,
  PosTransactionType,
  PosReportBucket,
  SubscriptionCheckoutInput,
  SubscriptionConcept,
  CartLine,
  LinkedCustomer,
  CreateProductInput,
  UpdateProductInput,
} from "./domain/types";

export { PosService } from "./application/posService";
export type { PosRepository } from "./application/posRepository";
export { PosApiError } from "./api/posHttpClient";
export { POS_API_PATHS } from "./api/posEndpoints";
export { buildPosApiUrl } from "./config/buildApiUrl";
export {
  createPosRepository,
} from "./infrastructure/createPosRepository";
export { RestPosRepository } from "./infrastructure/restPosRepository";
export { HybridPosRepository } from "./infrastructure/hybridPosRepository";
export {
  createMemoryPosRepository,
  sharedMemoryPosRepository,
} from "./infrastructure/memoryPosRepository";
export {
  createLocalPosStorage,
  loadPosProducts,
  loadPosSales,
  savePosProducts,
  savePosSales,
  clearPosLocalData,
  getPosSalesInRange,
} from "./infrastructure/localPosStorage";

export { filterSalesByType, normalizePosSale, resolveTransactionType } from "./domain/filterSales";
export {
  buildSubscriptionReceipt,
  subscriptionConceptLabel,
  ticketIdFromSaleId,
} from "./domain/subscriptionReceipt";
export { summarizePosSales } from "./domain/summarizeSales";
export { posConfig, getPosApiUrl } from "./config";
