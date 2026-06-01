import { useMemo, useState } from "react";
import {
  ScanFace,
  Shield,
  DoorOpen,
  Loader2,
  Radio,
  CheckCircle2,
  XCircle,
  UserPlus,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  appendAccessEnrollment,
  appendAccessLog,
  getAccessEnrollments,
  getAccessLog,
  getTurnstileStates,
  updateTurnstile,
  type AccessEnrollmentRecord,
} from "../lib/demoStore";
import { mockFaceIdEnroll, mockFaceIdVerify, mockTurnstileCommand } from "../lib/thirdPartyMocks";

type EnrollPhase = "idle" | "capturing" | "registering";

export default function AccessControl() {
  const [log, setLog] = useState(getAccessLog);
  const [turnstiles, setTurnstiles] = useState(getTurnstileStates);
  const [busy, setBusy] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState("TRN-MAIN-01");

  const [enrollMemberId, setEnrollMemberId] = useState("");
  const [enrollName, setEnrollName] = useState("");
  const [enrollTerminal, setEnrollTerminal] = useState("TRN-MAIN-01");
  const [enrollPhase, setEnrollPhase] = useState<EnrollPhase>("idle");
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [recentEnrollments, setRecentEnrollments] = useState<AccessEnrollmentRecord[]>(
    () => getAccessEnrollments().slice(0, 12),
  );

  const todayStats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = log.filter((e) => new Date(e.timestampIso) >= start);
    const granted = today.filter((e) => e.result === "GRANTED").length;
    const denied = today.filter((e) => e.result === "DENIED").length;
    const total = today.length;
    const rate = total === 0 ? 100 : Math.round((granted / total) * 1000) / 10;
    return { granted, denied, total, rate };
  }, [log]);

  const refreshFromStore = () => {
    setLog(getAccessLog());
    setTurnstiles(getTurnstileStates());
  };

  const simulateScan = async () => {
    setBusy(true);
    setLastLatency(null);
    const captureSessionId = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      const face = await mockFaceIdVerify({
        terminalId: selectedTerminal,
        captureSessionId,
      });

      setLastLatency(face.latencyMs);

      if (face.match && face.memberName) {
        const open = await mockTurnstileCommand({
          terminalId: selectedTerminal,
          command: "OPEN",
          correlationId: face.vendorRequestId,
        });
        updateTurnstile(selectedTerminal, { lastAction: "OPEN" });
        appendAccessLog({
          timestampIso: new Date().toISOString(),
          memberName: face.memberName,
          memberId: face.memberId,
          tier: face.membershipTier ?? "N/A",
          result: "GRANTED",
          terminalId: selectedTerminal,
          faceIdVendorRequestId: face.vendorRequestId,
          turnstileVendorCommandId: open.vendorCommandId,
        });
        window.setTimeout(() => {
          void mockTurnstileCommand({
            terminalId: selectedTerminal,
            command: "CLOSE",
            correlationId: `${face.vendorRequestId}_close`,
          }).then(() => {
            updateTurnstile(selectedTerminal, { lastAction: "CLOSED" });
            refreshFromStore();
          });
        }, 1800);
      } else {
        await mockTurnstileCommand({
          terminalId: selectedTerminal,
          command: "HOLD",
          correlationId: face.vendorRequestId,
        });
        updateTurnstile(selectedTerminal, { lastAction: "CLOSED" });
        appendAccessLog({
          timestampIso: new Date().toISOString(),
          memberName: "Unknown",
          tier: "N/A",
          result: "DENIED",
          reason: face.denyReason,
          terminalId: selectedTerminal,
          faceIdVendorRequestId: face.vendorRequestId,
          turnstileVendorCommandId: "ts_hold",
        });
      }
    } finally {
      refreshFromStore();
      setBusy(false);
    }
  };

  const runEnrollment = async () => {
    const mid = enrollMemberId.trim().toUpperCase();
    if (!mid) {
      toast.error("Indique el ID de miembro.", { description: "Ejemplo: MEM-1247" });
      return;
    }
    setEnrollBusy(true);
    setEnrollPhase("capturing");
    await new Promise((r) => setTimeout(r, 1000));
    setEnrollPhase("registering");
    try {
      const res = await mockFaceIdEnroll({
        terminalId: enrollTerminal,
        memberId: mid,
        displayName: enrollName.trim() || undefined,
      });
      const display = enrollName.trim() || mid;
      const rec = appendAccessEnrollment({
        memberId: mid,
        displayName: display,
        terminalId: enrollTerminal,
        templateId: res.templateId,
        qualityScore: res.qualityScore,
      });
      setRecentEnrollments((prev) => [rec, ...prev].slice(0, 12));
      toast.success("Rostro registrado", {
        description: `${display} · Calidad ${(res.qualityScore * 100).toFixed(1)}%`,
      });
    } catch {
      toast.error("No se pudo completar el registro", {
        description: "Compruebe la conexión del lector e intente de nuevo.",
      });
    } finally {
      setEnrollPhase("idle");
      setEnrollBusy(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatShort = (iso: string) =>
    new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="h-full bg-[#131313] p-4 md:p-8 overflow-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-[#e5e2e1] text-[32px] md:text-[48px] font-black tracking-[-2px] uppercase">
          Access Control
        </h1>
        <p className="text-[#808080] text-[12px] mt-3 max-w-3xl leading-relaxed">
          Control de accesos por reconocimiento facial y sincronización con torniquetes en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ScanFace className="text-[#e31e24]" size={22} />
              <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
                Verificación FaceID
              </p>
            </div>
            <span className="text-[9px] uppercase tracking-wider text-[#00ff00] font-bold">En línea</span>
          </div>
          <p className="text-[#e5e2e1] text-[28px] font-black mb-2">Lector listo</p>
          <p className="text-[#808080] text-[11px] mb-4">
            Inicie una lectura en el terminal seleccionado. Los eventos quedan registrados y el torniquete actúa según el
            resultado.
          </p>
          <div className="space-y-3 text-[10px]">
            <div>
              <label className="text-[#e7bdb8] uppercase tracking-wide block mb-1">Terminal</label>
              <select
                value={selectedTerminal}
                onChange={(e) => setSelectedTerminal(e.target.value)}
                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none"
              >
                <option value="TRN-MAIN-01">TRN-MAIN-01 — Entrada principal</option>
                <option value="TRN-MAIN-02">TRN-MAIN-02 — Entrada lateral</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void simulateScan()}
              disabled={busy}
              className="w-full bg-[#e31e24] text-[#410002] py-3 px-6 font-bold text-[12px] tracking-[1.2px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="animate-spin" size={18} /> : <ScanFace size={18} />}
              Escanear rostro
            </button>
            {lastLatency != null && (
              <p className="text-[#808080]">
                Última respuesta: <span className="text-[#e5e2e1] font-mono">{lastLatency} ms</span>
              </p>
            )}
          </div>
        </div>

        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <DoorOpen className="text-[#e31e24]" size={22} />
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">Torniquetes</p>
          </div>
          <div className="space-y-3">
            {turnstiles.map((t) => (
              <div
                key={t.terminalId}
                className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.15)] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-[#e5e2e1] text-[12px] font-bold font-mono">{t.terminalId}</p>
                  <p className="text-[#808080] text-[10px]">{t.label}</p>
                  <p className="text-[#393939] text-[9px] mt-2 uppercase">
                    Último evento: {t.lastEventIso ? formatTime(t.lastEventIso) : "—"}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1 text-[10px] text-[#00ff00] font-bold uppercase">
                    <Radio size={12} />
                    {t.online ? "online" : "offline"}
                  </div>
                  <p
                    className={`text-[11px] font-black uppercase ${
                      t.lastAction === "OPEN"
                        ? "text-[#00ff00]"
                        : t.lastAction === "ERROR"
                          ? "text-[#e31e24]"
                          : "text-[#e5e2e1]"
                    }`}
                  >
                    {t.lastAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[#808080] text-[10px] mt-4 leading-relaxed">
            Estado en vivo de los torniquetes vinculados. Los comandos de apertura y cierre regulan el acceso según la
            política del club.
          </p>
        </div>

        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="text-[#e31e24]" size={22} />
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
              Visitas hoy
            </p>
          </div>
          <p className="text-[#e5e2e1] text-[36px] font-black mb-4">{todayStats.total}</p>
          <div className="space-y-2 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-[#808080] flex items-center gap-1">
                <CheckCircle2 className="text-[#00ff00]" size={14} /> Otorgados
              </span>
              <span className="text-[#00ff00] font-bold">{todayStats.granted}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#808080] flex items-center gap-1">
                <XCircle className="text-[#e31e24]" size={14} /> Denegados
              </span>
              <span className="text-[#e31e24] font-bold">{todayStats.denied}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#808080]">Tasa éxito</span>
              <span className="text-[#e5e2e1] font-bold">{todayStats.rate}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="text-[#e31e24]" size={22} />
            <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
              Alta biométrica
            </p>
          </div>
          <h2 className="text-[#e5e2e1] text-[20px] md:text-[24px] font-black uppercase tracking-tight mb-2">
            Nuevo rostro FaceID
          </h2>
          <p className="text-[#808080] text-[11px] mb-6 leading-relaxed">
            Asocie la plantilla facial de un socio al sistema. Utilice el mismo terminal donde el miembro realizará el
            registro guiado.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[#e7bdb8] uppercase tracking-wide text-[10px] block mb-1.5">
                ID de miembro
              </label>
              <input
                type="text"
                value={enrollMemberId}
                onChange={(e) => setEnrollMemberId(e.target.value)}
                placeholder="MEM-1247"
                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 font-mono text-[12px] focus:border-[#e31e24] focus:outline-none uppercase"
                disabled={enrollBusy}
              />
            </div>
            <div>
              <label className="text-[#e7bdb8] uppercase tracking-wide text-[10px] block mb-1.5">
                Nombre (opcional)
              </label>
              <input
                type="text"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="Nombre para mostrar en el lector"
                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 text-[12px] focus:border-[#e31e24] focus:outline-none"
                disabled={enrollBusy}
              />
            </div>
            <div>
              <label className="text-[#e7bdb8] uppercase tracking-wide text-[10px] block mb-1.5">
                Terminal de registro
              </label>
              <select
                value={enrollTerminal}
                onChange={(e) => setEnrollTerminal(e.target.value)}
                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-3 py-2.5 focus:border-[#e31e24] focus:outline-none"
                disabled={enrollBusy}
              >
                <option value="TRN-MAIN-01">TRN-MAIN-01 — Entrada principal</option>
                <option value="TRN-MAIN-02">TRN-MAIN-02 — Entrada lateral</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-[9px] text-[#5a5a5a] uppercase tracking-wider">
              <span className={enrollPhase === "capturing" ? "text-[#e31e24] font-bold" : ""}>Captura</span>
              <span className="text-[#393939]">→</span>
              <span className={enrollPhase === "registering" ? "text-[#e31e24] font-bold" : ""}>Registro</span>
              <span className="text-[#393939]">→</span>
              <span className={enrollPhase === "idle" && !enrollBusy ? "text-[#808080]" : "text-[#393939]"}>
                Confirmación
              </span>
            </div>

            {enrollPhase === "capturing" && (
              <p className="text-[#e5e2e1] text-[11px] flex items-center gap-2">
                <Loader2 className="animate-spin text-[#e31e24] shrink-0" size={16} />
                Mantenga el rostro centrado frente al lector…
              </p>
            )}
            {enrollPhase === "registering" && (
              <p className="text-[#e5e2e1] text-[11px] flex items-center gap-2">
                <Loader2 className="animate-spin text-[#e31e24] shrink-0" size={16} />
                Procesando plantilla y sincronizando con el motor biométrico…
              </p>
            )}

            <button
              type="button"
              onClick={() => void runEnrollment()}
              disabled={enrollBusy}
              className="w-full bg-[#0e0e0e] border border-[#e31e24] text-[#e31e24] py-3 px-6 font-bold text-[11px] tracking-[1px] uppercase hover:bg-[#e31e24] hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {enrollBusy ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
              Iniciar registro facial
            </button>
          </div>
        </div>

        <div className="bg-[#2a2a2a] border border-[rgba(93,63,60,0.1)] p-6 flex flex-col min-h-[280px]">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-4">
            Últimos registros biométricos
          </p>
          {recentEnrollments.length === 0 ? (
            <p className="text-[#808080] text-[12px] flex-1 flex items-center">
              Aún no hay altas registradas desde este puesto.
            </p>
          ) : (
            <ul className="space-y-3 flex-1 overflow-auto max-h-[320px]">
              {recentEnrollments.map((r) => (
                <li
                  key={r.id}
                  className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.12)] p-3 text-[11px]"
                >
                  <div className="flex justify-between gap-2 mb-1">
                    <span className="text-[#e5e2e1] font-bold font-mono">{r.memberId}</span>
                    <span className="text-[#808080] font-mono text-[9px]">{r.terminalId}</span>
                  </div>
                  <p className="text-[#808080] text-[10px] mb-1">{r.displayName}</p>
                  <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 text-[9px] text-[#393939] font-mono">
                    <span title="Plantilla">{r.templateId}</span>
                    <span>{(r.qualityScore * 100).toFixed(1)}% cal.</span>
                  </div>
                  <p className="text-[#393939] text-[9px] mt-1.5">{formatShort(r.atIso)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
          <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase">
            Registro de accesos
          </p>
          <button
            type="button"
            onClick={refreshFromStore}
            className="text-[10px] font-bold uppercase tracking-wide text-[#808080] hover:text-[#e31e24] text-left sm:text-right"
          >
            Actualizar
          </button>
        </div>
        <div className="space-y-3">
          {log.length === 0 ? (
            <p className="text-[#808080] text-[13px] py-6 text-center">Sin eventos registrados</p>
          ) : (
            log.map((row) => (
              <div
                key={row.id}
                className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 py-3 border-b border-[rgba(93,63,60,0.05)]"
              >
                <div className="flex flex-wrap items-center gap-2 lg:gap-4">
                  <span
                    className={`text-[10px] font-bold tracking-[1px] uppercase ${
                      row.result === "GRANTED" ? "text-[#00ff00]" : "text-[#e31e24]"
                    }`}
                  >
                    {row.result}
                  </span>
                  <span className="text-[#e5e2e1] text-[14px] font-bold">{row.memberName}</span>
                  {row.memberId && (
                    <span className="text-[#808080] text-[10px] font-mono">{row.memberId}</span>
                  )}
                  <span className="text-[#808080] text-[10px] tracking-[1px] uppercase">{row.tier}</span>
                  <span className="text-[#393939] text-[9px] font-mono">{row.terminalId}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#808080] font-mono">
                  <span>{formatTime(row.timestampIso)}</span>
                  <span title="Solicitud FaceID">{row.faceIdVendorRequestId}</span>
                  <span title="Comando torniquete">{row.turnstileVendorCommandId}</span>
                  {row.reason && <span className="text-[#e31e24]">({row.reason})</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
