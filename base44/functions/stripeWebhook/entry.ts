import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata.user_email;
        const tier = session.metadata.tier;

        console.log('Subscription created for:', userEmail, 'tier:', tier);

        if (userEmail && userEmail !== 'anonymous') {
          // Update user subscription tier
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
          if (users[0]) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              subscription_tier: tier,
              trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });
          }

          // Create or update subscription record
          const existingSubs = await base44.asServiceRole.entities.Subscription.filter({
            created_by: userEmail
          });

          if (existingSubs[0]) {
            await base44.asServiceRole.entities.Subscription.update(existingSubs[0].id, {
              tier,
              status: 'trial',
              stripe_subscription_id: session.subscription,
              stripe_customer_id: session.customer,
              trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata.user_email;
        
        console.log('Subscription updated:', subscription.id);

        if (userEmail && userEmail !== 'anonymous') {
          const subs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: subscription.id
          });

          if (subs[0]) {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
              status: subscription.status === 'active' ? 'active' : 
                     subscription.cancel_at_period_end ? 'cancelled' : subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata.user_email;

        console.log('Subscription cancelled:', subscription.id);

        if (userEmail && userEmail !== 'anonymous') {
          const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
          if (users[0]) {
            await base44.asServiceRole.entities.User.update(users[0].id, {
              subscription_tier: 'free'
            });
          }

          const subs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: subscription.id
          });

          if (subs[0]) {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
              status: 'cancelled'
            });
          }
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});