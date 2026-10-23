import React, { useState, useEffect, useRef } from 'react';
import {
    createPointOrder,
    checkPaymentStatus,
    cancelPointOrder,
    getPaymentTerminals,      // NUEVO
    type PaymentStatus,       // NUEVO
    type PaymentTerminal,     // NUEVO
} from '../api/pointPaymentService';

interface CheckoutModalProps {
    saleId: string;
    onClose: () => void;
    // CAMBIO: recibe las cuotas (opcional, así no rompe a quien ya usa onSuccess())
    onSuccess: (info?: { installments: number }) => void;
}

// CAMBIO: 'loading' para recuperar estado, 'canceled' y 'refunded'
type PaymentPhase =
    | 'loading' | 'idle' | 'sending' | 'waiting'
    | 'approved' | 'rejected' | 'canceled' | 'expired' | 'refunded';

// CAMBIO: CANCELED y EXPIRED como los manda el backend
const FINAL_STATUSES: PaymentStatus[] = ['APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED', 'REFUNDED'];
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 11 * 60 * 1000; // la orden expira a los 10 min; 1 min de margen

// NUEVO: mensajes según la tabla de estados del documento
const waitingMessage = (mpStatus?: string | null) =>
    mpStatus === 'action_required'
        ? 'Procesando… siga las indicaciones de la terminal.'
        : 'Pida al socio que pague en la terminal.';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ saleId, onClose, onSuccess }) => {
    const [phase, setPhase] = useState<PaymentPhase>('loading');
    const [statusMessage, setStatusMessage] = useState('Consultando estado del cobro…');
    const [terminals, setTerminals] = useState<PaymentTerminal[]>([]); // NUEVO
    const [terminalId, setTerminalId] = useState('');

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const startedAtRef = useRef<number>(0);

    const busy = phase === 'loading' || phase === 'sending' || phase === 'waiting';
    const canRetry = phase === 'rejected' || phase === 'canceled' || phase === 'expired';

    // Detiene el polling y aborta la petición en curso
    const stopPolling = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        abortRef.current?.abort();
        abortRef.current = null;
    };

    // NUEVO: aplica el estado que regresa el POS API (la pantalla nunca decide "pagado")
    // Devuelve true si el estado es final
    const applyStatus = (data: Awaited<ReturnType<typeof checkPaymentStatus>>['data']): boolean => {
        const status = data?.paymentStatus;
        const installments = data?.installments ?? 1;
        const detail = data?.mp_status_detail;

        if (!status || !FINAL_STATUSES.includes(status)) {
            setStatusMessage(waitingMessage(data?.mp_status));
            return false;
        }

        stopPolling();
        switch (status) {
            case 'APPROVED':
                setPhase('approved');
                setStatusMessage(installments > 1 ? `Pago aprobado · ${installments} MSI` : 'Pago aprobado');
                setTimeout(() => onSuccess({ installments }), 1500);
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
            default:
                setPhase('canceled');
                setStatusMessage('Cobro cancelado.');
        }
        return true;
    };

    // Polling periódico para consultar el estado del pago
    const startPollingStatus = () => {
        stopPolling();
        abortRef.current = new AbortController();
        startedAtRef.current = Date.now();

        intervalRef.current = setInterval(async () => {
            if (Date.now() - startedAtRef.current > MAX_WAIT_MS) {
                stopPolling();
                setPhase('expired');
                setStatusMessage('Tiempo agotado, reintente.');
                return;
            }

            try {
                const res = await checkPaymentStatus(saleId, abortRef.current?.signal);
                applyStatus(res.data);
            } catch (error: any) {
                if (error?.name === 'AbortError') return;
                console.error('Error consultando estatus del pago:', error);
            }
        }, POLL_INTERVAL_MS);
    };

    // NUEVO: al abrir, cargar terminales y recuperar un cobro en curso (p. ej. tras recargar)
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
                } else if (!data?.order_id || !applyStatus(data)) {
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
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [saleId]);

    // Iniciar cobro en la terminal física
    const handleStartPayment = async () => {
        if (!terminalId) {
            setStatusMessage('Seleccione una terminal.');
            return;
        }
        try {
            setPhase('sending');
            setStatusMessage('Enviando orden a la terminal…');

            await createPointOrder({ saleId, terminalId });

            setPhase('waiting');
            setStatusMessage(waitingMessage('created'));
            startPollingStatus();
        } catch (error: any) {
            console.error(error);
            setPhase('idle');
            setStatusMessage(error.message || 'La terminal no respondió. Puede reintentar o usar otro método.');
        }
    };

    // Cancelar la orden si el usuario decide salir antes de tiempo
    const handleCancel = async () => {
        stopPolling();

        if (phase === 'waiting') {
            setStatusMessage('Cancelando orden en terminal…');
            try {
                if (!(await cancelPointOrder(saleId))) {
                    startPollingStatus();
                    setStatusMessage('No se pudo cancelar. Cancele el cobro desde la terminal antes de cerrar.');
                    return;
                }
            } catch (error) {
                // Si la orden ya está en la terminal, Mercado Pago no deja cancelarla por API
                console.warn('No se pudo cancelar por API; cancélela desde la terminal.', error);
            }
        }
        onClose();
    };

    // NUEVO: aviso si la terminal no está en modo PDV
    const selected = terminals.find((t) => t.id === terminalId);
    const notPdv = !!selected?.operating_mode && selected.operating_mode !== 'PDV';

    const messageColor =
        phase === 'approved' ? 'text-green-700'
        : canRetry ? 'text-red-600'
        : 'text-gray-600';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Cobro con Terminal Mercado Pago</h3>

                {/* CAMBIO: lista de terminales en lugar de input de texto */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terminal</label>
                    <select
                        value={terminalId}
                        onChange={(e) => setTerminalId(e.target.value)}
                        disabled={busy || phase === 'approved'}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                    >
                        {terminals.length === 0 && <option value="">Sin terminales disponibles</option>}
                        {terminals.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name || t.id}
                            </option>
                        ))}
                    </select>
                    {notPdv && (
                        <p className="mt-1 text-xs text-red-600">
                            La terminal no está en modo PDV ({selected?.operating_mode}); no recibirá cobros.
                        </p>
                    )}
                </div>

                <div className="bg-gray-50 p-4 rounded mb-6 text-center">
                    <p className={`text-sm font-medium ${messageColor}`}>{statusMessage}</p>
                    {busy && (
                        <div className="mt-3 animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                    )}
                </div>

                <div className="flex justify-end space-x-3">
                    {phase === 'waiting' ? (
                        <button
                            onClick={handleCancel}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                        >
                            Cancelar operación / Salir
                        </button>
                    ) : phase === 'approved' || phase === 'loading' ? null : (
                        <>
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                            >
                                Cerrar
                            </button>
                            {phase !== 'refunded' && (
                                <button
                                    onClick={handleStartPayment}
                                    disabled={busy || !terminalId}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
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