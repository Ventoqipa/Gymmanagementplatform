import React, { useState, useEffect } from 'react';
import { createPointOrder, checkPaymentStatus, cancelPointOrder } from '../api/pointPaymentService';

interface CheckoutModalProps {
    saleId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ saleId, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Listo para cobrar en terminal Point');
    const [terminalId, setTerminalId] = useState('NEWLAND_N950__N950NCC102544496'); // Puedes cambiarlo por tu ID de terminal por defecto
    const [orderCreated, setOrderCreated] = useState(false);

    // Iniciar cobro en la terminal física
    const handleStartPayment = async () => {
        try {
            setLoading(true);
            setStatusMessage('Enviando orden a la terminal física...');

            const response = await createPointOrder({ saleId, terminalId });
            
            setOrderCreated(true);
            setStatusMessage('¡Orden enviada! Por favor, desliza o inserta la tarjeta en la terminal...');
            
            // Iniciar sondeo (polling) para verificar el estado del pago
            startPollingStatus();
        } catch (error: any) {
            console.error(error);
            setStatusMessage(error.message || 'Error al comunicarse con la terminal.');
            setLoading(false);
        }
    };

    // Polling periódico para consultar el estado del pago
    const startPollingStatus = () => {
        const controller = new AbortController();
        const interval = setInterval(async () => {
            try {
                const res = await checkPaymentStatus(saleId, controller.signal);
                const paymentStatus = res.data?.paymentStatus;

                if (paymentStatus === 'APPROVED' || paymentStatus === 'closed') {
                    clearInterval(interval);
                    setStatusMessage('¡Pago aprobado con éxito!');
                    setTimeout(() => {
                        onSuccess(); // Cierra el modal y actualiza la vista de ventas
                    }, 1500);
                }
            } catch (error) {
                console.error('Error consultando estatus del pago:', error);
            }
        }, 3000); // Consulta cada 3 segundos

        // Limpiar intervalo y petición si el usuario cierra el modal
        return () => {
            clearInterval(interval);
            controller.abort();
        };
    };

    // Cancelar la orden si el usuario decide cerrar antes de tiempo
    const handleCancel = async () => {
        if (orderCreated) {
            setStatusMessage('Cancelando orden en terminal...');
            await cancelPointOrder(saleId);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Cobro con Terminal Point</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terminal ID:</label>
                    <input 
                        type="text" 
                        value={terminalId} 
                        onChange={(e) => setTerminalId(e.target.value)}
                        disabled={orderCreated}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                    />
                </div>

                <div className="bg-gray-50 p-4 rounded mb-6 text-center">
                    <p className="text-sm font-medium text-gray-600">{statusMessage}</p>
                    {loading && <div className="mt-3 animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>}
                </div>

                <div className="flex justify-end space-x-3">
                    {!orderCreated ? (
                        <>
                            <button 
                                onClick={handleCancel}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                            >
                                Cerrar
                            </button>
                            <button 
                                onClick={handleStartPayment}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                            >
                                {loading ? 'Procesando...' : 'Cobrar'}
                            </button>
                        </>
                    ) : (
                        <button 
                            onClick={handleCancel}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                        >
                            Cancelar Operación / Salir
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
