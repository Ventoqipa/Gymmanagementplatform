const API_BASE_URL =
  (import.meta as any).env?.VITE_POS_API_BASE_URL || '/api/v1';

// Ajusta esto o léelo de tus variables de entorno del frontend (ej. import.meta.env.VITE_POS_API_KEY)
const API_KEY = (import.meta as any).env?.VITE_POS_API_KEY || 'pos-dev-elitegym-temp-2026';

// CAMBIO: estados que maneja el POS (contrato con Elite)
export type PaymentStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'VOIDED';


export interface CreateOrderParams {
  saleId: string;
  amount?: number; // Opcional, ya que el backend lo lee directamente de la venta en base de datos
  terminalId?: string;
}

// NUEVO
export interface PaymentTerminal {
  id: string;
  name?: string;
  status?: string;
  operating_mode?: string | null; // debe ser "PDV"
  store_id?: string | null;
  pos_id?: string | number | null;
}

type ApiResponse = Record<string, unknown>;

// CAMBIO: incluye order_id y reused
type CreatePointOrderResponse = ApiResponse & {
  data?: {
    saleId?: string;
    order_id?: string | null;
    external_reference?: string;
    status?: string;
    reused?: boolean;
    mercado_pago_response?: unknown;
  };
};

// CAMBIO: incluye los campos nuevos de payment-status
type PaymentStatusResponse = ApiResponse & {
  data?: {
    saleId?: string;
    order_id?: string | null;
    paymentStatus?: PaymentStatus;
    mp_status?: string | null;          // created, at_terminal, action_required, processed...
    mp_status_detail?: string | null;   // motivo del rechazo, p. ej. insufficient_amount
    installments?: number | null;       // MSI
    payment_method?: string;
    message?: string;
  };
};

// NUEVO
type PaymentTerminalsResponse = ApiResponse & {
  data?: PaymentTerminal[];
};

// NUEVO
type RefundPointOrderResponse = ApiResponse & {
  data?: {
    saleId?: string;
    order_id?: string;
    paymentStatus?: PaymentStatus;
  };
};

// NUEVO: headers comunes
function headers(withJson = false): HeadersInit {
  return withJson
    ? { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY }
    : { 'X-Api-Key': API_KEY };
}

async function parseJson(response: Response): Promise<ApiResponse> {
  const text = await response.text();
  let data: unknown;

  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  return data as ApiResponse;
}

// CAMBIO: prioriza messageUser (mensaje para el cajero) sobre message (técnico)
function getResponseMessage(data: ApiResponse, fallback: string): string {
  if (typeof data.messageUser === 'string' && data.messageUser.trim()) {
    return data.messageUser;
  }
  return typeof data.message === 'string' && data.message.trim()
    ? data.message
    : fallback;
}

// NUEVO: GET /api/v1/payment-terminals
export async function getPaymentTerminals(): Promise<PaymentTerminalsResponse> {
  const response = await fetch(`${API_BASE_URL}/payment-terminals`, {
    headers: headers(),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al cargar las terminales'));
  }

  return data as PaymentTerminalsResponse;
}

export async function createPointOrder({ saleId, terminalId }: CreateOrderParams): Promise<CreatePointOrderResponse> {
  // POST /api/v1/sales/{saleId}/point-order
  const response = await fetch(`${API_BASE_URL}/sales/${encodeURIComponent(saleId)}/point-order`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({ terminal_id: terminalId }),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al crear la orden en la terminal'));
  }

  return data as CreatePointOrderResponse;
}

export async function checkPaymentStatus(saleId: string, signal?: AbortSignal): Promise<PaymentStatusResponse> {
  // GET /api/v1/sales/{saleId}/payment-status
  const response = await fetch(
    `${API_BASE_URL}/sales/${encodeURIComponent(saleId)}/payment-status`,
    { signal, headers: headers() }
  );

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al consultar estado'));
  }
  return data as PaymentStatusResponse;
}

export async function cancelPointOrder(saleId: string): Promise<boolean> {
  try {
    // POST /api/v1/sales/{saleId}/point-cancel
    const response = await fetch(`${API_BASE_URL}/sales/${encodeURIComponent(saleId)}/point-cancel`, {
      method: 'POST',
      headers: headers(true),
    });

    await parseJson(response);
    return response.ok;
  } catch (error) {
    console.error('Error cancelando orden en terminal:', error);
    return false;
  }
}

// NUEVO: POST /api/v1/sales/{saleId}/point-refund
export async function refundPointOrder(saleId: string): Promise<RefundPointOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${encodeURIComponent(saleId)}/point-refund`, {
    method: 'POST',
    headers: headers(true),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al reembolsar el cobro'));
  }

  return data as RefundPointOrderResponse;
}

// Ventas con tarjeta sin pagar
export interface PendingSale {
  id: string;
  ticketId?: string;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus | 'VOIDED';
  linesSummary?: string | null;
  payerName?: string | null;
  memberName?: string | null;
  dateIso: string;
  transactionType?: string;
  orderId?: string | null;
  orderStatus?: string | null;
  mpStatus?: string | null;
  attempt?: number | null;
}

type PendingSalesResponse = ApiResponse & { data?: PendingSale[] };

// GET /api/v1/sales/pending-payments
export async function getPendingPayments(): Promise<PendingSalesResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/pending-payments`, {
    headers: headers(),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al cargar los cobros pendientes'));
  }
  return data as PendingSalesResponse;
}

// POST /api/v1/sales/{saleId}/void
export async function voidSale(saleId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/sales/${encodeURIComponent(saleId)}/void`, {
    method: 'POST',
    headers: headers(true),
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'No se pudo anular la venta'));
  }
  return data;