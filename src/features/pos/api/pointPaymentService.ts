const API_BASE_URL = 
  (import.meta as any).env?.VITE_POS_API_BASE_URL || '/api/v1';

// Ajusta esto o léeo de tus variables de entorno del frontend (ej. import.meta.env.VITE_API_KEY)
const API_KEY = (import.meta as any).env?.VITE_POS_API_KEY || 'pos-dev-elitegym-temp-2026';

export interface CreateOrderParams {
  saleId: string;
  amount?: number; // Opcional, ya que el backend lo lee directamente de la venta en base de datos
  terminalId?: string;
}

type ApiResponse = Record<string, unknown>;

type CreatePointOrderResponse = ApiResponse & {
  data?: {
    saleId?: string;
    external_reference?: string;
    status?: string;
    mercado_pago_response?: unknown;
  };
};

type PaymentStatusResponse = ApiResponse & {
  data?: {
    saleId?: string;
    paymentStatus?: string;
    message?: string;
  };
};

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

function getResponseMessage(data: ApiResponse, fallback: string): string {
  return typeof data.message === 'string' && data.message.trim()
    ? data.message
    : fallback;
}

export async function createPointOrder({ saleId, terminalId }: CreateOrderParams): Promise<CreatePointOrderResponse> {
  // Apunta al nuevo endpoint REST: POST /api/v1/sales/{saleId}/point-order
  const response = await fetch(`${API_BASE_URL}/sales/${saleId}/point-order`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY 
    },
    body: JSON.stringify({ terminal_id: terminalId })
  });

  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al crear la orden en la terminal'));
  }

  return data as CreatePointOrderResponse;
}

export async function checkPaymentStatus(saleId: string, signal?: AbortSignal): Promise<PaymentStatusResponse> {
  // Apunta al nuevo endpoint REST: GET /api/v1/sales/{saleId}/payment-status
  const response = await fetch(
    `${API_BASE_URL}/sales/${saleId}/payment-status`,
    { 
      signal,
      headers: {
        'X-Api-Key': API_KEY
      }
    }
  );
  
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(getResponseMessage(data, 'Error al consultar estado'));
  }
  return data as PaymentStatusResponse;
}

export async function cancelPointOrder(saleId: string): Promise<boolean> {
  try {
    // Apunta al nuevo endpoint REST: POST /api/v1/sales/{saleId}/point-cancel
    const response = await fetch(`${API_BASE_URL}/sales/${saleId}/point-cancel`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY
      }
    });
    
    const data = await parseJson(response);
    return response.ok;
  } catch (error) {
    console.error("Error cancelando orden en terminal:", error);
    return false;
  }
}
