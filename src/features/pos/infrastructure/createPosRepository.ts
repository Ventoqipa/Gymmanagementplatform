import { posConfig } from "../config";
import type { PosRepository } from "../application/posRepository";
import { HybridPosRepository } from "./hybridPosRepository";
import { MemoryPosRepository, sharedMemoryPosRepository } from "./memoryPosRepository";
import { RestPosRepository } from "./restPosRepository";

let instance: PosRepository | null = null;

export function createPosRepository(): PosRepository {
  if (instance) return instance;

  if (posConfig.useMock) {
    instance = sharedMemoryPosRepository;
    return instance;
  }

  const remote = new RestPosRepository();
  const local = sharedMemoryPosRepository;
  instance = new HybridPosRepository(remote, local);
  return instance;
}

export function resetPosRepositoryForTests(): void {
  instance = null;
}

export { MemoryPosRepository };
