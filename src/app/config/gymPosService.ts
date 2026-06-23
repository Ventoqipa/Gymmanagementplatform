import {
  createLocalPosStorage,
  createPosRepository,
  PosService,
} from "@/features/pos";
import { gymPosConfig } from "./posHost";

let gymPosService: PosService | null = null;

/** Servicio POS compartido (reportes, pagos de suscripción fuera del terminal). */
export function getGymPosService(): PosService {
  if (!gymPosService) {
    const storage = createLocalPosStorage(gymPosConfig.storageKeys);
    gymPosService = new PosService(createPosRepository(gymPosConfig, storage));
  }
  return gymPosService;
}
