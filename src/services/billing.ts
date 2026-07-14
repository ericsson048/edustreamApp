import { apiClient } from './apiClient';

export interface CheckoutResponse {
  checkout_url?: string;
  session_id?: string;
  publishable_key?: string;
  transaction?: {
    id: string;
    amount_paid: string;
    platform_fee: string;
    instructor_earning: string;
    status: string;
  };
}

export interface CheckoutStatusResponse {
  paid: boolean;
  status?: string;
  payment_status?: string;
  enrollment_id?: string;
  transaction?: CheckoutResponse['transaction'] | null;
}

export const billingService = {
  async createCheckout(courseId: string) {
    const { data } = await apiClient.post<CheckoutResponse>(`/billing/checkout/${courseId}/`);
    return data;
  },
  async verifySession(sessionId: string) {
    const { data } = await apiClient.get<CheckoutStatusResponse>('/billing/checkout/session/', {
      params: { session_id: sessionId },
    });
    return data;
  },
};
