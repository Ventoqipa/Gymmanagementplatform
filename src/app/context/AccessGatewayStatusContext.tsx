import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchGatewayDiagnostics,
  isAccessGatewayConfigured,
  pingAccessGateway,
  reconnectEliteToGateway,
  setAccessGatewayRuntimeUrl,
  type GatewayDiagnostics,
} from "../core/accessGateway";
import { useAuth } from "./AuthContext";

const GYM_GATEWAY_URL = "http://127.0.0.1:8787";

export type AccessLinkStatus = "checking" | "connected" | "disconnected";

type AccessGatewayStatusValue = {
  status: AccessLinkStatus;
  online: boolean;
  checking: boolean;
  devicesOnline: number;
  devicesTotal: number;
  terminals: NonNullable<GatewayDiagnostics["terminals"]>;
  infoMessage: string;
  lastCheckedLabel: string | null;
  refreshStatus: () => Promise<void>;
  reconnect: () => Promise<{ ok: boolean; message: string }>;
  reconnecting: boolean;
};

const AccessGatewayStatusContext = createContext<
  AccessGatewayStatusValue | undefined
>(undefined);

function buildInfoMessage(options: {
  online: boolean;
  devicesOnline: number;
  devicesTotal: number;
}): string {
  if (!options.online) {
    return "Sin conexión con el sistema de acceso. Pulse Reconectar en Panel.";
  }
  if (options.devicesTotal === 0) {
    return "Sistema conectado. Aún no hay lectores reportados.";
  }
  if (options.devicesOnline === 0) {
    return "Sistema conectado. Esperando señal de los lectores…";
  }
  if (options.devicesOnline === options.devicesTotal) {
    return `Todo listo: ${options.devicesOnline} lector(es) conectado(s).`;
  }
  return `${options.devicesOnline} de ${options.devicesTotal} lector(es) conectado(s).`;
}

export function AccessGatewayStatusProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<AccessLinkStatus>("checking");
  const [checking, setChecking] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [devicesOnline, setDevicesOnline] = useState(0);
  const [devicesTotal, setDevicesTotal] = useState(0);
  const [terminals, setTerminals] = useState<
    NonNullable<GatewayDiagnostics["terminals"]>
  >([]);
  const [infoMessage, setInfoMessage] = useState(
    "Comprobando conexión con el sistema de acceso…",
  );
  const [lastCheckedLabel, setLastCheckedLabel] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    setStatus((prev) => (prev === "connected" ? prev : "checking"));
    try {
      if (!isAccessGatewayConfigured()) {
        setAccessGatewayRuntimeUrl(GYM_GATEWAY_URL);
      }
      const [health, diagnostics] = await Promise.all([
        pingAccessGateway(),
        fetchGatewayDiagnostics(),
      ]);
      const list = diagnostics?.terminals ?? [];
      const onlineCount =
        diagnostics?.devicesOnline ?? list.filter((t) => t.online).length;
      const total = list.length;
      setTerminals(list);
      setDevicesOnline(onlineCount);
      setDevicesTotal(total);
      setStatus(health.ok ? "connected" : "disconnected");
      setInfoMessage(
        buildInfoMessage({
          online: health.ok,
          devicesOnline: onlineCount,
          devicesTotal: total,
        }),
      );
      setLastCheckedLabel(
        new Date().toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch {
      setStatus("disconnected");
      setDevicesOnline(0);
      setInfoMessage(
        "No se pudo comprobar la conexión. Pulse Reconectar en Panel.",
      );
    } finally {
      setChecking(false);
    }
  }, []);

  const reconnect = useCallback(async () => {
    setReconnecting(true);
    setStatus("checking");
    setInfoMessage("Reconectando con el sistema de acceso…");
    try {
      const result = await reconnectEliteToGateway(GYM_GATEWAY_URL);
      await refreshStatus();
      if (result.ok) {
        setInfoMessage(
          result.devicesOnline && result.devicesOnline > 0
            ? `Conexión restablecida. ${result.devicesOnline} lector(es) activo(s).`
            : "Conexión restablecida. Espere a que los lectores aparezcan en verde.",
        );
        return {
          ok: true,
          message: "Conexión restablecida correctamente.",
        };
      }
      setStatus("disconnected");
      setInfoMessage(
        "No se pudo reconectar. Reinicie el PC del gym e intente de nuevo.",
      );
      return {
        ok: false,
        message: "No se pudo reconectar el sistema de acceso.",
      };
    } finally {
      setReconnecting(false);
    }
  }, [refreshStatus]);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus("checking");
      setInfoMessage("Inicie sesión para ver el estado de acceso.");
      return;
    }
    void refreshStatus();
    const id = window.setInterval(() => void refreshStatus(), 5000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, refreshStatus]);

  const value = useMemo<AccessGatewayStatusValue>(
    () => ({
      status,
      online: status === "connected",
      checking,
      devicesOnline,
      devicesTotal,
      terminals,
      infoMessage,
      lastCheckedLabel,
      refreshStatus,
      reconnect,
      reconnecting,
    }),
    [
      status,
      checking,
      devicesOnline,
      devicesTotal,
      terminals,
      infoMessage,
      lastCheckedLabel,
      refreshStatus,
      reconnect,
      reconnecting,
    ],
  );

  return (
    <AccessGatewayStatusContext.Provider value={value}>
      {children}
    </AccessGatewayStatusContext.Provider>
  );
}

export function useAccessGatewayStatus() {
  const ctx = useContext(AccessGatewayStatusContext);
  if (!ctx) {
    throw new Error(
      "useAccessGatewayStatus must be used within AccessGatewayStatusProvider",
    );
  }
  return ctx;
}
