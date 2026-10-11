import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Activity,
  ArrowLeft,
  Check,
  Info,
  Loader2,
  Pencil,
  PlugZap,
  Radio,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchGatewayActivity,
  removeGatewayTerminal,
  renameGatewayTerminal,
  type GatewayActivityRow,
  type GatewayTerminal,
} from "../core/accessGateway";
import { useAccessGatewayStatus } from "../context/AccessGatewayStatusContext";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function friendlyActivity(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("reconexion") || m.includes("reconexión")) {
    return "Se reconectó el sistema de acceso";
  }
  if (m.includes("nuevo lector")) return "Se detectó un lector nuevo";
  if (m.includes("renombrado")) return "Se cambió el nombre de un lector";
  if (m.includes("quitado de la lista")) return "Se quitó un lector de la lista";
  if (m.includes("attlog")) return "Registro de acceso recibido";
  if (m.includes("attphoto")) return "Foto de acceso recibida";
  if (m.includes("handshake") || m.includes("registry")) {
    return "Un lector se registró en el sistema";
  }
  if (m.includes("getrequest →") || m.includes("comandos")) {
    return "Se envió una orden a un lector";
  }
  if (m.includes("ping") || m.includes("getrequest")) {
    return "Un lector está en contacto";
  }
  if (m.includes("diagnostico") || m.includes("diagnóstico")) {
    return "Chequeo del sistema";
  }
  return message;
}

const DEFAULT_LABEL = /^Lector \d+$/;

function needsName(t: GatewayTerminal): boolean {
  return Boolean(t.autoDetected) && DEFAULT_LABEL.test(t.label ?? "");
}

export default function AccessHardware() {
  const {
    status,
    online,
    checking,
    devicesOnline,
    devicesTotal,
    terminals,
    infoMessage,
    lastCheckedLabel,
    refreshStatus,
    reconnect,
    reconnecting,
    applyTerminals,
  } = useAccessGatewayStatus();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const startEdit = (t: GatewayTerminal) => {
    setEditingId(t.terminalId);
    setEditLabel(t.label ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel("");
  };

  const saveLabel = async (terminalId: string) => {
    const label = editLabel.trim();
    if (!label) {
      toast.error("Escriba un nombre para el lector.");
      return;
    }
    setSavingId(terminalId);
    const result = await renameGatewayTerminal(terminalId, label);
    setSavingId(null);
    if (!result.ok) {
      toast.error("No se pudo cambiar el nombre", { description: result.message });
      return;
    }
    applyTerminals(result.terminals);
    cancelEdit();
    toast.success(`Lector guardado como “${label}”`);
  };

  const removeReader = async (t: GatewayTerminal) => {
    if (
      !window.confirm(
        `¿Quitar “${t.label || t.terminalId}” de la lista? Úselo solo si ese lector ya no existe. Si se vuelve a conectar, aparecerá de nuevo.`,
      )
    ) {
      return;
    }
    setSavingId(t.terminalId);
    const result = await removeGatewayTerminal(t.terminalId);
    setSavingId(null);
    if (!result.ok) {
      toast.error("No se pudo quitar el lector", { description: result.message });
      return;
    }
    applyTerminals(result.terminals);
    toast.success("Lector quitado de la lista");
  };

  const [activity, setActivity] = useState<GatewayActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [panelBusy, setPanelBusy] = useState(false);
  const [banner, setBanner] = useState("");

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    setActivityError("");
    try {
      if (!online) {
        setActivity([]);
        setActivityError(
          "Sin conexión: la actividad aparecerá cuando el sistema esté conectado.",
        );
        return;
      }
      const act = await fetchGatewayActivity(50);
      setActivity(act);
      if (act.length === 0) {
        setBanner(
          "Conectado. Todavía no hay movimientos; cuando un socio pase o un lector responda, se listarán aquí.",
        );
      } else {
        setBanner("");
      }
    } catch {
      setActivityError("No se pudo cargar la actividad. Intente Actualizar.");
    } finally {
      setActivityLoading(false);
    }
  }, [online]);

  useEffect(() => {
    void loadActivity();
    const id = window.setInterval(() => void loadActivity(), 4000);
    return () => window.clearInterval(id);
  }, [loadActivity]);

  const onRefresh = async () => {
    setPanelBusy(true);
    setBanner("Actualizando estado y actividad…");
    try {
      await refreshStatus();
      await loadActivity();
      toast.message("Información actualizada");
      setBanner("Datos actualizados.");
    } finally {
      setPanelBusy(false);
    }
  };

  const onReconnect = async () => {
    setBanner("Reconectando… espere un momento.");
    const result = await reconnect();
    await loadActivity();
    if (result.ok) {
      toast.success(result.message);
      setBanner(result.message);
    } else {
      toast.error(result.message);
      setBanner(result.message);
    }
  };

  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as { autoCheck?: boolean; from?: string } | null;
  const returnTo = navState?.from === "/access-control" ? navState.from : null;
  const autoCheckDone = useRef(false);

  useEffect(() => {
    if (!navState?.autoCheck || autoCheckDone.current) return;
    autoCheckDone.current = true;
    if (online) {
      void onRefresh();
    } else {
      void onReconnect();
    }
    // Solo al llegar desde Control de acceso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allReadersOk =
    online && terminals.length > 0 && terminals.every((t) => t.online);

  const busy = panelBusy || reconnecting || (checking && status === "checking");
  const statusTitle =
    status === "checking"
      ? "Comprobando…"
      : status === "connected"
        ? "Conectado"
        : "Sin conexión";
  const statusColor =
    status === "checking"
      ? "text-[#c8c8c8]"
      : status === "connected"
        ? "text-[#00ff00]"
        : "text-[#e31e24]";

  return (
    <div className="h-full bg-[#131313] p-4 md:p-6 overflow-auto relative">
      {busy ? (
        <div className="absolute inset-0 z-20 bg-black/45 flex items-center justify-center">
          <div className="bg-[#131313] border border-[rgba(93,63,60,0.3)] px-6 py-5 flex items-center gap-3">
            <Loader2 className="animate-spin text-[#e31e24]" size={22} />
            <div>
              <p className="text-[#e5e2e1] text-sm font-bold uppercase tracking-wide">
                {reconnecting
                  ? "Reconectando"
                  : panelBusy
                    ? "Actualizando"
                    : "Comprobando conexión"}
              </p>
              <p className="text-[#808080] text-[12px] mt-1">
                Espere un momento, no cierre esta pantalla.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-[#e5e2e1] text-[22px] md:text-[30px] font-black tracking-[-0.5px] uppercase leading-tight">
            Panel
          </h1>
          <p className="text-[#808080] text-[13px] mt-1 max-w-xl">
            Lectores, actividad reciente y reconexión del sistema de acceso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {returnTo ? (
            <button
              type="button"
              onClick={() => navigate(returnTo)}
              disabled={busy}
              className={`inline-flex items-center gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wide disabled:opacity-50 ${
                allReadersOk
                  ? "bg-[#00c853] text-[#0e0e0e] hover:bg-[#00e676]"
                  : "bg-[#1a1a1a] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] hover:bg-[#222]"
              }`}
            >
              <ArrowLeft size={16} />
              Volver a Control de acceso
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onReconnect()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#e31e24] text-white text-[11px] font-bold uppercase tracking-wide hover:bg-[#c41a20] disabled:opacity-50"
          >
            {reconnecting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <PlugZap size={16} />
            )}
            Reconectar
          </button>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] text-[11px] font-bold uppercase tracking-wide hover:bg-[#222] disabled:opacity-50"
          >
            {panelBusy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Actualizar
          </button>
        </div>
      </div>

      <div
        className={`mb-4 border px-4 py-3 flex gap-3 items-start ${
          status === "connected"
            ? "border-[rgba(0,255,0,0.25)] bg-[rgba(0,255,0,0.06)]"
            : status === "checking"
              ? "border-[rgba(200,200,200,0.2)] bg-[rgba(200,200,200,0.06)]"
              : "border-[rgba(227,30,36,0.35)] bg-[rgba(227,30,36,0.08)]"
        }`}
      >
        {checking || reconnecting ? (
          <Loader2 className={`animate-spin shrink-0 mt-0.5 ${statusColor}`} size={18} />
        ) : (
          <Info className={`shrink-0 mt-0.5 ${statusColor}`} size={18} />
        )}
        <div>
          <p className={`text-[13px] font-bold ${statusColor}`}>
            {banner || infoMessage}
          </p>
          {lastCheckedLabel ? (
            <p className="text-[#5a5a5a] text-[11px] mt-1">
              Última comprobación: {lastCheckedLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-5 mb-4">
        <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
          Estado
        </p>
        <div className="flex items-center gap-3">
          {(checking || reconnecting) && (
            <Loader2 className={`animate-spin ${statusColor}`} size={22} />
          )}
          <p className={`text-[28px] font-black uppercase ${statusColor}`}>
            {statusTitle}
          </p>
        </div>
        <p className="text-[#808080] text-[14px] mt-2">
          {devicesTotal > 0
            ? `Lectores: ${devicesOnline} conectado(s) de ${devicesTotal}`
            : online
              ? "Esperando que los lectores reporten señal…"
              : "Pulse Reconectar para intentar de nuevo."}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="text-[#e31e24]" size={18} />
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
              Dispositivos
            </p>
            {checking ? (
              <Loader2 size={14} className="animate-spin text-[#808080]" />
            ) : null}
          </div>
          <p className="text-[#5a5a5a] text-[12px] mb-4">
            Los lectores aparecen solos en cuanto se conectan. Use el lápiz para ponerle a
            cada uno un nombre fácil de reconocer.
          </p>
          {terminals.length === 0 ? (
            <p className="text-[#808080] text-[14px]">
              {online
                ? "Aún no hay lectores reportados. Espere unos segundos o pulse Reconectar."
                : "Sin datos. Pulse Reconectar."}
            </p>
          ) : (
            <div className="space-y-3">
              {terminals.map((t) => {
                const isEditing = editingId === t.terminalId;
                const isSaving = savingId === t.terminalId;
                const details = [
                  t.serial ? `Serie ${t.serial}` : null,
                  t.info?.ip ? `IP ${t.info.ip}` : null,
                  t.info?.faceCount ? `${t.info.faceCount} rostros` : null,
                ].filter(Boolean);
                return (
                  <div
                    key={t.terminalId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[rgba(93,63,60,0.1)] pb-3"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") void saveLabel(t.terminalId);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            maxLength={40}
                            autoFocus
                            disabled={isSaving}
                            placeholder="Ej. Entrada principal"
                            className="flex-1 min-w-0 bg-[#131313] border border-[#e31e24] text-[#e5e2e1] px-3 py-2 text-[14px] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => void saveLabel(t.terminalId)}
                            disabled={isSaving}
                            title="Guardar"
                            className="p-2 bg-[#e31e24] text-white hover:bg-[#c41a20] disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={16} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={isSaving}
                            title="Cancelar"
                            className="p-2 border border-[rgba(93,63,60,0.3)] text-[#808080] hover:text-[#e5e2e1]"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[#e5e2e1] text-[16px] font-bold">
                            {t.label || "Lector de acceso"}
                          </p>
                          <button
                            type="button"
                            onClick={() => startEdit(t)}
                            disabled={!online || savingId !== null}
                            title="Cambiar nombre"
                            className="p-1 text-[#808080] hover:text-[#e31e24] disabled:opacity-40"
                          >
                            <Pencil size={14} />
                          </button>
                          {needsName(t) ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-[rgba(255,165,0,0.12)] text-[#ffa500]">
                              Nuevo · póngale nombre
                            </span>
                          ) : null}
                        </div>
                      )}
                      <p className="text-[#5a5a5a] text-[12px] mt-0.5">
                        {t.lastSeenIso
                          ? `Última señal: ${formatShort(t.lastSeenIso)}`
                          : "Sin señal reciente"}
                      </p>
                      {details.length > 0 ? (
                        <p className="text-[#5a5a5a] text-[11px] mt-0.5 font-mono">
                          {details.join(" · ")}
                        </p>
                      ) : null}
                      {online && !t.online ? (
                        <p className="text-[#ffa500] text-[11px] mt-1">
                          Revise que esté encendido, con cable de red y con servidor = IP de
                          este PC, puerto 8096. Luego pulse Reconectar.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!t.online && !isEditing ? (
                        <button
                          type="button"
                          onClick={() => void removeReader(t)}
                          disabled={!online || savingId !== null}
                          title="Quitar de la lista"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#808080] border border-[rgba(93,63,60,0.3)] hover:text-[#e31e24] hover:border-[#e31e24] disabled:opacity-40"
                        >
                          <Trash2 size={12} />
                          Quitar
                        </button>
                      ) : null}
                      <span
                        className={`text-[12px] font-bold uppercase tracking-wide px-3 py-1 ${
                          t.online
                            ? "bg-[rgba(0,255,0,0.12)] text-[#00ff00]"
                            : "bg-[rgba(227,30,36,0.12)] text-[#e31e24]"
                        }`}
                      >
                        {t.online ? "Conectado" : "Desconectado"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-[#e31e24]" size={18} />
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
              Actividad
            </p>
            {activityLoading ? (
              <Loader2 size={14} className="animate-spin text-[#808080]" />
            ) : null}
          </div>
          <div className="max-h-[380px] overflow-auto space-y-2">
            {activityLoading && activity.length === 0 ? (
              <div className="flex items-center gap-2 text-[#808080] text-[14px] py-6">
                <Loader2 size={16} className="animate-spin" />
                Cargando actividad…
              </div>
            ) : activityError ? (
              <p className="text-[#e31e24] text-[14px]">{activityError}</p>
            ) : activity.length === 0 ? (
              <p className="text-[#808080] text-[14px]">
                Todavía no hay actividad. Cuando un socio pase o un lector
                responda, aparecerá aquí.
              </p>
            ) : (
              activity.map((row) => (
                <div
                  key={row.id}
                  className="flex gap-3 border-b border-[rgba(93,63,60,0.08)] pb-2"
                >
                  <span className="text-[#5a5a5a] text-[12px] shrink-0 tabular-nums">
                    {formatTime(row.atIso)}
                  </span>
                  <span className="text-[#e5e2e1] text-[13px]">
                    {friendlyActivity(row.message)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
