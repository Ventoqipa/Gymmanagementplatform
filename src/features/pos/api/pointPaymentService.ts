// src/features/pos/api/pointPaymentService.ts

const API_BASE_URL =
  (import.meta as any).env?.VITE_POS_API_BASE_URL || '/pos-api';

export interface PointOrderResponse {
  success?: boolean;
  paymentId?: number;
  orderId?: string;
  mp_order_id?: string;
  sale_id?: string;
  intentId?: string; // ID devuelto por Mercado Pago (ej. "32a76f2b-...")
  status?: string;
  error?: string;
  data?: any;
}

export interface PaymentStatusResponse {
  status:
    | 'created'
    | 'OPEN'
    | 'processed'
    | 'FINISHED'
    | 'failed'
    | 'canceled'
    | 'CANCELED'
    | 'rejected'
    | 'REJECTED'
    | 'expired'
    | 'EXPIRED'
    | 'ERROR'
    | 'refunded'
    | 'not_found';
  mp_order_id?: string;
  amount?: number;
  payer_id?: string | null;
}

export interface CreatePointOrderParams {
  saleId: string;
  amount?: number;
  terminalId?: string;
}

/**
 * Enviar solicitud de cobro a la terminal Point mediante el backend PHP
 */
export async function createPointOrder(
  param1: string | CreatePointOrderParams,
  param2?: string | number
): Promise<PointOrderResponse> {
  let saleId: string;
  let amount: number | undefined;
  let terminalId: string = 'NEWLAND_N950__N950NCC102544496';

  if (typeof param1 === 'object') {
    saleId = param1.saleId;
    amount = param1.amount;
    if (param1.terminalId && param1.terminalId !== 'NEWLAND_N950__SBX0000001') {
      terminalId = param1.terminalId;
    }
  } else {
    saleId = param1;
    if (typeof param2 === 'number') {
      amount = param2;
    } else if (typeof param2 === 'string' && param2 !== 'NEWLAND_N950__SBX0000001') {
      terminalId = param2;
    }
  }

  console.log("Enviando orden Point a terminal física:", { saleId, amount, terminalId });

  const response = await fetch(
    `${API_BASE_URL}/point-order.php?saleId=${encodeURIComponent(saleId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        saleId,
        terminalId,
        amount,
      }),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || (data && data.success === false)) {
    const errorMessage =
      data?.error || data?.message || 'Error al procesar la orden en la terminal';
    throw new Error(errorMessage);
  }

  // Extraemos el ID de la intención que devuelve Mercado Pago en data.id o data.data.id
  const intentId = data?.data?.id || data?.id || data?.intentId;

  return {
    ...data,
    intentId, // Lo devolvemos para usarlo en el Polling
  };
}

/**
 * Consultar el estado del pago mediante Polling por saleId o paymentIntentId
 */
export async function checkPaymentStatus(
  identifier: string
): Promise<PaymentStatusResponse> {
  // Envía tanto saleId como paymentIntentId para asegurarnos de que el PHP capture la consulta correcta
  const response = await fetch(
    `${API_BASE_URL}/payment-status.php?saleId=${encodeURIComponent(
      identifier
    )}&paymentIntentId=${encodeURIComponent(identifier)}`
  );

  if (!response.ok) {
    throw new Error('No se pudo verificar el estado del pago');
  }

  return await response.json();
}