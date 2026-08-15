// netlify/functions/create-checkout-session.js
//
// Creates a Stripe Checkout Session server-side. The secret key lives only
// here (as a Netlify environment variable) and never reaches the browser.
//
// Required Netlify environment variable:
//   STRIPE_SECRET_KEY   — your Stripe secret key (sk_test_... while testing,
//                          sk_live_... once you're ready to take real orders)
//
// Optional environment variables (sensible defaults are used if omitted):
//   TEE_PRICE_USD        — price in dollars, defaults to 23.99
//   SHIPPING_FLAT_USD     — flat domestic shipping rate in dollars, defaults to 5.99
//   FREE_SHIPPING_OVER_USD — order subtotal (pre-shipping) that qualifies for
//                            free shipping, defaults to 75
//   SITE_URL              — your live domain, e.g. https://freeheadkicks.com
//                            (falls back to the deploy URL Netlify provides)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { size, qty } = JSON.parse(event.body || '{}');
    const quantity = Math.min(Math.max(parseInt(qty, 10) || 1, 1), 10);
    const validSizes = ['S', 'M', 'L', 'XL', '2XL'];
    const chosenSize = validSizes.includes(size) ? size : 'M';

    const teePriceUsd = parseFloat(process.env.TEE_PRICE_USD || '23.99');
    const shippingFlatUsd = parseFloat(process.env.SHIPPING_FLAT_USD || '5.99');
    const freeShippingOverUsd = parseFloat(process.env.FREE_SHIPPING_OVER_USD || '75');
    const siteUrl = process.env.SITE_URL || process.env.URL || 'https://freeheadkicks.com';

    const subtotal = teePriceUsd * quantity;
    const qualifiesForFreeShipping = subtotal >= freeShippingOverUsd;

    // Build shipping options: always offer the flat rate; also offer free
    // shipping as a separate selectable option once the order qualifies.
    const shippingOptions = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: Math.round(shippingFlatUsd * 100), currency: 'usd' },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 4 },
            maximum: { unit: 'business_day', value: 8 },
          },
        },
      },
    ];

    if (qualifiesForFreeShipping) {
      shippingOptions.unshift({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'usd' },
          display_name: `Free Shipping (orders $${freeShippingOverUsd}+)`,
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 4 },
            maximum: { unit: 'business_day', value: 8 },
          },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(teePriceUsd * 100),
            product_data: {
              name: `Free Headkicks Tee — Size ${chosenSize}`,
              description: 'Unisex, 100% cotton, black. #FHK',
            },
          },
        },
      ],
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      shipping_options: shippingOptions,
      // Size isn't a native Checkout field, so it travels as metadata —
      // it'll show up on the Payment/Order details in the Stripe Dashboard
      // and in the checkout.session.completed webhook payload.
      metadata: {
        size: chosenSize,
        quantity: String(quantity),
        product: 'Free Headkicks Tee',
      },
      success_url: `${siteUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#shop`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe Checkout Session error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Something went wrong creating checkout.' }),
    };
  }
};
