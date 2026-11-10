import {
  createLocalPosStorage,
  createPosRepository,
  PosService,
  setDirectDebitConfig,
} from "@/features/pos";
import { gymPosConfig } from "./posHost";

// NUEVO: la domiciliación usa la misma configuración que el POS
setDirectDebitConfig(() => gymPosConfig);

let gymPosService: PosService | null = null;

/** Servicio POS compartido (reportes, pagos de suscripción fuera del terminal). */
export function getGymPosService(): PosService {
  if (!gymPosService) {
    const storage = createLocalPosStorage(gymPosConfig.storageKeys);
    gymPosService = new PosService(createPosRepository(gymPosConfig, storage));
  }
  return gymPosService;
}