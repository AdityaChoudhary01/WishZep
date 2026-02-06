'use server';

import Razorpay from 'razorpay';

/**
 * Server Action to create a Razorpay Order.
 * Uses environment variables for security.
 */
export async function createRazorpayOrder(amount: number) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { success: false, error: 'Payment gateway configuration missing.' };
  }

  const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const options = {
    amount: Math.round(amount * 100), // Amount in paise
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await instance.orders.create(options);
    return { success: true, orderId: order.id, amount: order.amount };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create order.' };
  }
}
