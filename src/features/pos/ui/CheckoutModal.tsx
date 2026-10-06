// src/features/pos/ui/CheckoutModal.tsx

import React, { useEffect, useState, useRef } from 'react';
import { createPointOrder, checkPaymentStatus } from '../api/pointPaymentService';

interface CheckoutModalProps {
  saleId: string;
  amount: number;
  terminalId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  saleId,
  amount,
  terminalId = 'NEWLAND_N950__N950NCC102544496',
  onSuccess,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'waiting' | 'processed' | 'error'>('waiting');
  const [statusMessage, setStatusMessage] = useState('Enviando orden a la terminal Point...');

  // Referencia para guardar el paymentIntentId que genera la API de Mercado Pago
  const currentIntentIdRef = useRef<string | null>(null);

  // Contador de tiempo (Timeout) para evitar bucles infinitos si la tarjeta falla y no se cancela la terminal
  const pollAttemptsRef = useRef(0);
  const MAX_POLL_ATTEMPTS = 45; // 45 intentos * 2 segundos = 90 segundos de espera máxima

  // Referencia para controlar el intervalo
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleStartPayment = async () => {
    stopPolling();
    pollAttemptsRef.current = 0;

    // Generar sufijo único si es un reintento por error
    let currentSaleId = saleId;
    if (paymentStatus === 'error') {
      currentSaleId = `${saleId}_R${Date.now().toString().slice(-4)}`;
    }

    setStatusMessage('Enviando orden a la terminal Point...');
    setPaymentStatus('waiting');
    setLoading(true);

    try {
      const response = await createPointOrder({ saleId: currentSaleId, amount, terminalId });
      
      // Capturamos el intentId devuelto por la API
      if (response.intentId) {
        currentIntentIdRef.current = response.intentId;
      }

      setStatusMessage('Esperando a que el cliente deslice/acerque su tarjeta en la terminal...');

      // Consultar rastreando por el ID de la transacción actual
      startPolling(currentSaleId);
    } catch (err: any) {
      stopPolling();
      setPaymentStatus('error');
      setStatusMessage(err.message || 'Error al conectar con la terminal');
      setLoading(false);
    }
  };

  const startPolling = (targetSaleId: string) => {
    const checkStatus = async () => {
      pollAttemptsRef.current += 1;

      try {
        const res = await checkPaymentStatus(targetSaleId);
        
        // Convertimos el estado a mayúsculas para evitar problemas de formato
        const rawStatus = (res.status || '').toString().toUpperCase();

        // 1. CASO ÉXITO
        if (rawStatus === 'FINISHED' || rawStatus === 'PROCESSED') {
          stopPolling();
          setPaymentStatus('processed');
          setStatusMessage('¡Pago Aprobado con Éxito!');
          setLoading(false);

          setTimeout(() => {
            onSuccess();
          }, 1500);
        } 
        // 2. CASO FALLO O CANCELACIÓN EXPLÍCITA
        else if (['FAILED', 'CANCELED', 'REJECTED', 'EXPIRED', 'ERROR'].includes(rawStatus)) {
          stopPolling();
          setPaymentStatus('error');
          setStatusMessage('El pago fue rechazado o cancelado en la terminal.');
          setLoading(false);
        }
      } catch (err) {
        // Ignorar fallos de red aislados durante la consulta
      }

      // 3. CASO TIMEOUT (Si la terminal muestra "Intenta de nuevo" la API se queda colgada en OPEN)
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        stopPolling();
        setPaymentStatus('error');
        setStatusMessage('Tiempo de espera agotado o la tarjeta fue rechazada. Presiona Reintentar.');
        setLoading(false);
      }
    };

    // Primera revisión inmediata
    checkStatus();

    // Activar el intervalo cada 2 segundos
    pollingRef.current = setInterval(checkStatus, 2000);
  };

  useEffect(() => {
    if (!saleId || amount <= 0) return;

    handleStartPayment();

    return () => {
      stopPolling();
    };
  }, [saleId, amount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-stone-900 border border-stone-800 rounded-xl shadow-2xl text-stone-100">
        <h3 className="text-xl font-bold text-center mb-4 text-red-500">
          Cobro con Mercado Pago Point
        </h3>

        <div className="p-4 bg-stone-800/80 rounded-lg text-center mb-6 border border-stone-700/50">
          <p className="text-sm text-stone-400">Total a Pagar</p>
          <p className="text-3xl font-extrabold text-white">
            ${amount.toFixed(2)} MXN
          </p>
          <p className="text-xs text-stone-500 mt-1">Orden #{saleId}</p>
        </div>

        <div className="text-center py-4">
          {loading && (
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent mb-4"></div>
          )}
          <p className={`text-sm ${paymentStatus === 'error' ? 'text-red-400 font-semibold' : 'text-stone-300'}`}>
            {statusMessage}
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {paymentStatus === 'error' && (
            <button
              onClick={handleStartPayment}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition shadow-md"
            >
              Reintentar Cobro
            </button>
          )}
          <button
            onClick={() => {
              stopPolling();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-stone-700 hover:bg-stone-600 rounded-lg font-medium transition"
          >
            {paymentStatus === 'processed' ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
};
