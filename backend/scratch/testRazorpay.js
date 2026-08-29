import 'dotenv/config';
import Razorpay from 'razorpay';

async function test() {
  console.log('Key ID:', process.env.RAZORPAY_KEY_ID);
  console.log('Key Secret:', process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing');

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      amount: 23482, // 234.82 in paisa
      currency: 'INR',
      receipt: `test_${Date.now()}`,
    });
    console.log('Razorpay Order Created Successfully:', order);
  } catch (err) {
    console.error('Razorpay Order Creation Error:', err);
  }
}

test();
