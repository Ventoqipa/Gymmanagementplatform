import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PosService } from "../application/posService";
import type { PosConfig } from "../config/types";
import { createLocalPosStorage } from "../infrastructure/localPosStorage";
import { createPosRepository } from "../infrastructure/createPosRepository";
import type { LinkedCustomer } from "../domain/types";

export type PosContextValue = {
  config: PosConfig;
  service: PosService;
  linkedCustomer: LinkedCustomer | null;
};

const PosContext = createContext<PosContextValue | null>(null);

export type PosProviderProps = {
  config: PosConfig;
  children: ReactNode;
  linkedCustomer?: LinkedCustomer | null;
};

export function PosProvider({
  config,
  children,
  linkedCustomer = null,
}: PosProviderProps) {
  const value = useMemo(() => {
    const storage = createLocalPosStorage(config.storageKeys);
    const repository = createPosRepository(config, storage);
    const service = new PosService(repository);
    return { config, service, linkedCustomer };
  }, [config, linkedCustomer]);

  return (
    <PosContext.Provider value={value}>{children}</PosContext.Provider>
  );
}

export function usePosContext(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) {
    throw new Error("usePosContext debe usarse dentro de PosProvider");
  }
  return ctx;
}
