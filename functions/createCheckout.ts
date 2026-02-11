import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_IDS = {
  pro: 'price_1SzdJVBGYRp2F1OBAINpjfhb',
  family: 'price_1SzdJVBGYRp2F1OBNVQhPHTo'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { tier, successUrl, cancelUrl } = await req.json();

    console.log('Creating checkout for tier:', tier);

    if (!tier || !PRICE_IDS[tier]) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get user email if authenticated
    let customerEmail;
    try {
      const user = await base44.auth.me();
      customerEmail = user?.email;
    } catch (e) {
      console.log('User not authenticated, proceeding without email');
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/subscription`,
      customer_email: customerEmail,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        tier,
        user_email: customerEmail || 'anonymous'
      },
      subscription_data: {
        metadata: {
          tier,
          user_email: customerEmail || 'anonymous'
        },
        trial_period_days: 14
      }
    });

    console.log('Checkout session created:', session.id);
    return Response.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});