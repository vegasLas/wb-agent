import apiClient from './client';

// Payment tariffs from backend constants/payments.ts
export const PAYMENT_TARIFFS = [
  {
    id: 'subscription_30',
    name: 'Подписка на 30 дней',
    description: 'Полный доступ на 30 дней',
    price: 999,
    type: 'subscription' as const,
    days: 30,
  },
  {
    id: 'subscription_90',
    name: 'Подписка на 90 дней',
    description: 'Полный доступ на 90 дней (-10%)',
    price: 2699,
    type: 'subscription' as const,
    days: 90,
  },
  {
    id: 'subscription_365',
    name: 'Подписка на 365 дней',
    description: 'Полный доступ на год (-25%)',
    price: 8999,
    type: 'subscription' as const,
    days: 365,
  },
  {
    id: 'bookings_5',
    name: '5 автоброней',
    description: 'Добавить 5 автоброней',
    price: 499,
    type: 'bookings' as const,
    bookingCount: 5,
  },
  {
    id: 'bookings_15',
    name: '15 автоброней',
    description: 'Добавить 15 автоброней (-10%)',
    price: 1349,
    type: 'bookings' as const,
    bookingCount: 15,
  },
  {
    id: 'bookings_50',
    name: '50 автоброней',
    description: 'Добавить 50 автоброней (-25%)',
    price: 4499,
    type: 'bookings' as const,
    bookingCount: 50,
  },
];

export interface PaymentTariff {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'subscription' | 'bookings';
  days?: number;
  bookingCount?: number;
}

export interface Payment {
  id: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'canceled' | 'waiting_for_capture';
  tariffId: string;
  createdAt: string;
  paidAt?: string | null;
  confirmation?: {
    confirmation_url?: string;
  };
}

export interface CreatePaymentRequest {
  tariffId: string;
  email: string;
}

export interface CreatePaymentResponse {
  id: string;
  status: string;
  confirmation?: {
    confirmation_url: string;
  };
}

export const paymentsAPI = {
  /**
   * POST /api/v1/payments/create
   * Create a new payment
   */
  async createPayment(tariffId: string, email: string): Promise<CreatePaymentResponse> {
    const response = await apiClient.post<CreatePaymentResponse>('/payments/create', {
      tariffId,
      email,
    });
    return response.data;
  },

  /**
   * GET /api/v1/payments/history
   * Get user's payment history
   */
  async getPaymentHistory(): Promise<Payment[]> {
    const response = await apiClient.get<Payment[]>('/payments/history');
    return response.data;
  },

  /**
   * GET /api/v1/payments/check
   * Check payment status (returns HTML page)
   */
  async checkPaymentStatus(key: string): Promise<string> {
    const response = await apiClient.get('/payments/check', { 
      params: { key },
      responseType: 'text',
    });
    return response.data;
  },

  /**
   * Get available tariffs
   */
  getTariffs(): PaymentTariff[] {
    return PAYMENT_TARIFFS;
  },
};
