import React, { useState, useEffect, useRef } from 'react';
import {
    createPointOrder,
    checkPaymentStatus,
    cancelPointOrder,
    getPaymentTerminals,
    type PaymentStatus,
    type PaymentTerminal,
} from '../api/pointPaymentService';

interface CheckoutModalProps {
    saleId: string;
    onClose: () => void;
    // Recibe las cuotas (opcional, así no rompe a quien ya usa onSuccess())
    onSuccess: (info?: { installments: number }) => void;
}

// CAMBIO: 'canceling' (cancelando por API) y 'voided' (venta anulada)
type PaymentPhase =
    | 'loading' | 'idle' | 'sending' | 'waiting' | 'canceling'
    | 'approved' | 'rejected' | 'canceled' | 'expired' | 'refunded' | 'voided';

// CAMBIO: VOIDED también es final
const FINAL_STATUSES: PaymentStatus[] = ['APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED', 'REFUNDED', 'VOIDED'];
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 11 * 60 * 1000; // la orden expira a los 10 min; 1 min de margen
const MAX_FAILURES_BEFORE_WARNING = 3; // NUEVO

// Mensajes según la tabla de estados del documento
const waitingMessage = (mpStatus?: string | null) =>
    mpStatus === 'action_required'
        ? 'Procesando… siga las indicaciones de la terminal.'
        : 'Pida al socio que pague en la terminal.';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ saleId, onClose, onSuccess }) => {
    const [phase, setPhase] = useState<PaymentPhase>('loading');
    const [statusMessage, setStatusMessage] = useState('Consultando estado del cobro…');
    const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
    const [terminalId, setTerminalId] = useState('');
    // NUEVO: la orden ya está en la terminal y no se pudo cancelar por API
    const [cancelBlocked, setCancelBlocked] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const startedAtRef = useRef<number>(0);
    const inFlightRef = useRef(false);        // NUEVO: evita consultas encimadas
    const failuresRef = useRef(0);            // NUEVO: fallos de red seguidos
    const sendingRef = useRef(false);         // NUEVO: evita doble clic en "Cobrar"
    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // NUEVO

    const busy = phase === 'loading' || phase === 'sending' || phase === 'waiting' || phase === 'canceling';
    const canRetry = phase === 'rejected' || phase === 'canceled' || phase === 'expired';
    const isClosedSale = phase === 'refunded' || phase === 'voided'; // NUEVO: no se puede cobrar

    // Detiene el polling y aborta la petición en curso
    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        abortRef.current?.abort();
        abortRef.current = null;
        inFlightRef.current = false;
    };

    // Aplica el estado que regresa el POS API (la pantalla nunca decide "pagado")
    // Devuelve true si el estado es final
    const applyStatus = (data: Awaited<ReturnType<typeof checkPaymentStatus>>['data']): boolean => {
        const status = data?.paymentStatus;
        const installments = data?.installments ?? 1;
        const detail = data?.mp_status_detail;

        if (!status || ! FINAL_STATUSES.includes(status)) {
            setStatusMessage(waitingMessage(data?.mp_status));
            return false;
        }

        stopPolling();
        setCancelBlocked(false);
        switch (status) {
            case 'APPROVED':
                setPhase('approved');
                setStatusMessage(installments > 1 ? `Pago aprobado · ${installments} MSI` : 'Pago aprobado');
                successTimeoutRef.current = setTimeout(() => onSuccess({ installments }), 1500);
                break;
            case 'REJECTED':
                setPhase('rejected');
                setStatusMessage(`Pago rechazado${detail ? ` (${detail})` : ''}, intente otro medio.`);
                break;
            case 'EXPIRED':
                setPhase('expired');
                setStatusMessage('Tiempo agotado, reintente.');
                break;
            case 'REFUNDED':
                setPhase('refunded');
                setStatusMessage('Pago reembolsado.');
                break;
            case 'VOIDED': // NUEVO
                setPhase('voided');
                setStatusMessage('Venta anulada. Ya no se puede cobrar.');
                break;
            default:
                setPhase('canceled');
                setStatusMessage('Cobro cancelado.');
        }
        return true;
    };

    // Polling periódico para consultar el estado del pago
    // CAMBIO: resetTimer=false al reanudar tras un intento de cancelación fallido
    const startPollingStatus = (resetTimer = true) => {
        stopPolling();
        abortRef.current = new AbortController();
        failuresRef.current = 0;
        if (resetTimer || !startedAtRef.current) startedAtRef.current = Date.now();

        intervalRef.current = setInterval(async () => {
            if (Date.now() - startedAtRef.current > MAX_WAIT_MS) {
                stopPolling();
                setPhase('expired');
                setStatusMessage('Tiempo agotado, reintente.');
                return;
            }
            if (inFlightRef.current) return; // NUEVO: la consulta anterior sigue en curso
            inFlightRef.current = true;

            try {
                const res = await checkPaymentStatus(saleId, abortRef.current?.signal);
                failuresRef.current = 0;
                applyStatus(res.data);
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
                console.error('Error consultando estatus del pago:', error);
                // NUEVO: avisar si el servidor no responde
                failuresRef.current += 1;
                if (failuresRef.current >= MAX_FAILURES_BEFORE_WARNING) {
                    setStatusMessage('Sin conexión con el servidor, reintentando…');
                }
            } finally {
                inFlightRef.current = false;
            }
        }, POLL_INTERVAL_MS);
    };

    // Al abrir: cargar terminales y recuperar un cobro en curso (p. ej. tras recargar)
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const termRes = await getPaymentTerminals();
                const list = termRes.data ?? [];
                if (!cancelled) {
                    setTerminals(list);
                    setTerminalId((prev) => prev || list[0]?.id || '');
                }
            } catch (error) {
                console.error('No se pudieron cargar las terminales:', error);
            }

            try {
                const res = await checkPaymentStatus(saleId);
                if (cancelled) return;
                const data = res.data;

                if (data?.order_id && data.paymentStatus === 'PENDING') {
                    setPhase('waiting');
                    setStatusMessage(waitingMessage(data.mp_status));
                    startPollingStatus();
                } else if (
                    // CAMBIO: una venta anulada también se reconoce aunque no tenga orden
                    data && (data.order_id || data.paymentStatus === 'VOIDED') && applyStatus(data)
                ) {
                    // estado final ya aplicado
                } else {
                    setPhase('idle');
                    setStatusMessage('Listo para cobrar en terminal Mercado Pago');
                }
            } catch {
                if (!cancelled) {
                    setPhase('idle');
                    setStatusMessage('Listo para cobrar en terminal Mercado Pago');
                }
            }
        })();

        // Limpia todo si el modal se desmonta
        return () => {
            cancelled = true;
            stopPolling();
            if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current); // NUEVO
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saleId]);

    // Iniciar cobro en la terminal física
    const handleStartPayment = async () => {
        if (!terminalId) {
            setStatusMessage('Seleccione una terminal.');
            return;
        }
        if (sendingRef.current) return; // NUEVO: doble clic
        sendingRef.current = true;
        try {
            setPhase('sending');
            setCancelBlocked(false);
            setStatusMessage('Enviando orden a la terminal…');

            await createPointOrder({ saleId, terminalId });

            setPhase('waiting');
            setStatusMessage(waitingMessage('created'));
            startPollingStatus();
        } catch (error: any) {
            console.error(error);
            setPhase('idle');
            setStatusMessage(error.message || 'La terminal no respondió. Puede reintentar o usar otro método.');
        } finally {
            sendingRef.current = false;
        }
    };

    // CAMBIO: si la orden ya está en la terminal, no se cierra el modal a ciegas
    const handleCancel = async () => {
        if (phase !== 'waiting') {
            stopPolling();
            onClose();
            return;
        }

        stopPolling();
        setPhase('canceling');
        setStatusMessage('Cancelando orden en terminal…');
        try {
            await cancelPointOrder(saleId);
            onClose();
        } catch (error) {
            // Mercado Pago no deja cancelar por API una orden que ya está en la terminal
            console.warn('No se pudo cancelar por API:', error);
            setCancelBlocked(true);
            setPhase('waiting');
            setStatusMessage('La orden ya está en la terminal. Cancélela en la terminal o espere a que el socio pague.');
            startPollingStatus(false); // seguir vigilando: puede llegar APPROVED o CANCELED
        }
    };

    // NUEVO: salir sin cancelar; la venta queda en "Cobros pendientes"
    const handleLeave = () => {
        stopPolling();
        onClose();
    };

    // Aviso si la terminal no está en modo PDV
    const selected = terminals.find((t) => t.id === terminalId);
    const notPdv = !!selected?.operating_mode && selected.operating_mode !== 'PDV';

    const messageColor =
        phase === 'approved' ? 'text-green-400'
        : canRetry || phase === 'voided' ? 'text-[#e31e24]'
        : 'text-[#e5e2e1]';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#131313] border border-[rgba(93,63,60,0.2)] p-6 md:p-8 w-full max-w-md">
                <div className="mb-6">
                    <p className="text-[#e31e24] text-[10px] font-bold tracking-[2px] uppercase mb-2">
                        Terminal Mercado Pago
                    </p>
                    <h3 className="text-[#e5e2e1] text-[18px] font-black tracking-[-0.5px] uppercase">
                        Cobro con tarjeta
                    </h3>
                    <p className="text-[#808080] text-[11px] font-mono mt-1">{saleId}</p>
                </div>

                <div className="mb-4">
                    <label className="block text-[#808080] text-[10px] font-bold tracking-[1.2px] uppercase mb-2">
                        Terminal
                    </label>
                    <select
                        value={terminalId}
                        onChange={(e) => setTerminalId(e.target.value)}
                        disabled={busy || phase === 'approved' || isClosedSale}
                        className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] px-4 py-3 text-[13px] focus:border-[#e31e24] focus:outline-none disabled:opacity-60"
                    >
                        {terminals.length === 0 && <option value="">Sin terminales disponibles</option>}
                        {terminals.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name || t.id}
                            </option>
                        ))}
                    </select>
                    {notPdv && (
                        <p className="mt-2 text-[11px] text-[#e31e24]">
                            La terminal no está en modo PDV ({selected?.operating_mode}); no recibirá cobros.
                        </p>
                    )}
                </div>

                <div className="bg-[#0e0e0e] border border-[rgba(93,63,60,0.1)] p-4 mb-6 text-center">
                    <p className={`text-[13px] font-medium ${messageColor}`}>{statusMessage}</p>
                    {busy && (
                        <div className="mt-3 animate-spin rounded-full h-6 w-6 border-b-2 border-[#e31e24] mx-auto"></div>
                    )}
                </div>

                <div className="flex gap-3">
                    {phase === 'waiting' || phase === 'canceling' ? (
                        cancelBlocked ? (
                            // NUEVO: no se pudo cancelar por API
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="w-full bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                            >
                                Salir sin cancelar (queda pendiente)
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={phase === 'canceling'}
                                className="w-full bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50"
                            >
                                Cancelar operación / Salir
                            </button>
                        )
                    ) : phase === 'approved' || phase === 'loading' ? null : (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 bg-[#0e0e0e] border border-[rgba(93,63,60,0.2)] text-[#e5e2e1] py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#1a1a1a] transition-colors"
                            >
                                Cerrar
                            </button>
                            {!isClosedSale && (
                                <button
                                    type="button"
                                    onClick={handleStartPayment}
                                    disabled={busy || !terminalId}
                                    className="flex-1 bg-[#e31e24] text-white py-3 font-bold text-[10px] tracking-[1px] uppercase hover:bg-[#c41a20] transition-colors disabled:opacity-50"
                                >
                                    {phase === 'sending' ? 'Procesando…' : canRetry ? 'Reintentar cobro' : 'Cobrar'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};