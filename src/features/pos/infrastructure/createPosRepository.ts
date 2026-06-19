import type { PosConfig } from "../config/types";
import type { PosRepository } from "../application/posRepository";
import { HybridPosRepository } from "./hybridPosRepository";
import {
  createMemoryPosRepository,
  type MemoryPosRepository,
} from "./memoryPosRepository";
import type { LocalPosStorage } from "./localPosStorage";
import { RestPosRepository } from "./restPosRepository";

export function createPosRepository(
  config: PosConfig,
  storage: LocalPosStorage,
): PosRepository {
  const local = createMemoryPosRepository(storage);

  if (config.useMock || config.dataSource === "local") {
    return local;
  }

  const remote = new RestPosRepository(config);

  if (config.dataSource === "hybrid") {
    return new HybridPosRepository(remote, local);
  }

  return remote;
}

export type { MemoryPosRepository };
