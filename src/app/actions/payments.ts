
'use server';

import Razorpay from 'razorpay';

/**
 * Server Action to create a Razorpay Order.
 * Using provided test keys for the testing version.
 */
export async function createRazorpayOrder(amount: number) {
  const instance = new Razorpay({
    key_id: 'rzp_test_SCOa15nvOPerXF',
    key_secret: 'FA6S0DPc3ZbOM6PxE700puj5',
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
    console.error('Razorpay Order Creation Error:', error);
    return { success: false, error: error.message || 'Failed to create order.' };
  }
}
