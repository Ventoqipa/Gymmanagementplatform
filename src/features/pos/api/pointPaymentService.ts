const API_BASE_URL =
  (import.meta as any).env?.VITE_POS_API_BASE_URL || '/pos-api';

export interface CreateOrderParams {
  saleId: string;
  amount: number;
  terminalId?: string;
}

export async function createPointOrder({ saleId, amount, terminalId }: CreateOrderParams) {
  const response = await fetch(`${API_BASE_URL}/point-order.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saleId, amount, terminalId })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Error al crear la orden en la terminal');
  }

  return data;
}

export async function checkPaymentStatus(saleId: string) {
  const response = await fetch(`${API_BASE_URL}/payment-status.php?saleId=${encodeURIComponent(saleId)}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Error al consultar estado');
  }

  return data;
}

export async function cancelPointOrder(paymentIntentId?: string, terminalId: string = 'NEWLAND_N950__N950NCC102544496') {
  try {
    const response = await fetch(`${API_BASE_URL}/point-cancel.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, terminalId })
    });
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Error cancelando orden:", error);
    return false;
  }
}