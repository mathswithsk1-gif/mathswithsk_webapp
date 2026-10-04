const { Safepay } = require('@sfpy/node-sdk');
// require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.SAFEPAY_API_KEY;
const secret = process.env.SAFEPAY_SECRET;
const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET;

console.log("API Key:", apiKey);
console.log("Secret:", secret ? "PRESENT" : "MISSING");

const safepay = new Safepay({
  environment: 'sandbox',
  apiKey: apiKey,
  v1Secret: secret,
  webhookSecret: webhookSecret
});

async function runTest() {
  try {
    console.log("1. Creating payment session/token...");
    const sessionResponse = await safepay.payments.create({
      amount: 4000,
      currency: 'PKR'
    });
    console.log("Session response:", sessionResponse);

    if (sessionResponse && sessionResponse.token) {
      console.log("2. Creating checkout url...");
      const checkoutUrl = safepay.checkout.create({
        token: sessionResponse.token,
        orderId: 'sk_ref_test_123',
        cancelUrl: 'http://localhost:3000/cancel',
        redirectUrl: 'http://localhost:3000/success',
        source: 'custom',
        webhooks: true
      });
      console.log("Generated checkout URL:", checkoutUrl);
    } else {
      console.error("No token in response.");
    }
  } catch (error) {
    console.error("Error running test:", error);
  }
}

runTest();
