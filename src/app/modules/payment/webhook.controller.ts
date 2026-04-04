import { Request, Response } from 'express';
import PaymentService from './payment.service';
import httpStatus from 'http-status';
import { stripe } from '../../../config/stripe';

class WebhookController {

  handleStripeWebhook = async (req: Request, res: Response) => {

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ Stripe webhook secret not configured');
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Webhook secret not configured',
      });
    }

    (res.locals as any).webhookSecretPreview =
      endpointSecret.substring(0, 10) + '...';

    let event;

    try {

      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

      (res.locals as any).webhookSignatureVerified = true;
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        signature: sig ? sig.substring(0, 20) + '...' : 'No signature',
        bodyLength: req.body ? req.body.length : 0,
      });

      (res.locals as any).webhookSignatureVerified = false;
      (res.locals as any).webhookSignatureError =
        err?.message || 'unknown error';
      return res.status(httpStatus.BAD_REQUEST).json({
        error: `Webhook Error: ${err.message}`,
      });
    }

    try {

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object);
          break;

        case 'payment_intent.amount_capturable_updated':
          await this.handleAmountCapturableUpdated(event.data.object);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event.data.object);
          break;

        case 'transfer.created':
          await this.handleTransferCreated(event.data.object);
          break;

        case 'transfer.updated':
          await this.handleTransferUpdated(event.data.object);
          break;

        case 'payout.created':
          await this.handlePayoutCreated(event.data.object);
          break;

        case 'payout.updated':
          await this.handlePayoutUpdated(event.data.object);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error(`Error processing webhook event ${event.type}:`, error);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to process webhook event',
      });
    }
  };

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    try {

      const bidId = paymentIntent.metadata?.bid_id;
      if (!bidId) {
        console.error(
          '❌ No bid_id found in payment intent metadata:',
          paymentIntent.metadata
        );
        return;
      }

      console.log('🎯 Processing payment for bid:', bidId);

      await PaymentService.handleWebhookEvent({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      });

      console.log(
        '✅ Successfully processed payment_intent.succeeded for bid:',
        bidId
      );
    } catch (error) {
      console.error('❌ Error handling payment succeeded:', error);
      throw error;
    }
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    try {
      console.log(`Payment failed: ${paymentIntent.id}`);

      const bidId = paymentIntent.metadata?.bid_id;
      if (!bidId) {
        console.error('No bid_id found in payment intent metadata');
        return;
      }

      await PaymentService.handleWebhookEvent({
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      });

      console.log(
        `Successfully processed payment_intent.payment_failed for bid ${bidId}`
      );
    } catch (error) {
      console.error('Error handling payment failed:', error);
      throw error;
    }
  }

  private async handlePaymentCanceled(paymentIntent: any): Promise<void> {
    try {
      console.log(`Payment canceled: ${paymentIntent.id}`);

      const bidId = paymentIntent.metadata?.bid_id;
      if (!bidId) {
        console.error('No bid_id found in payment intent metadata');
        return;
      }

      await PaymentService.handleWebhookEvent({
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      });

      console.log(
        `Successfully processed payment_intent.canceled for bid ${bidId}`
      );
    } catch (error) {
      console.error('Error handling payment canceled:', error);
      throw error;
    }
  }

  private async handleAmountCapturableUpdated(
    paymentIntent: any
  ): Promise<void> {
    try {

      const bidId = paymentIntent.metadata?.bid_id;
      if (!bidId) {
        console.error(
          '❌ No bid_id found in payment intent metadata:',
          paymentIntent.metadata
        );
        return;
      }

      await PaymentService.handleWebhookEvent({
        type: 'payment_intent.amount_capturable_updated',
        data: { object: paymentIntent },
      });

    } catch (error) {
      console.error('❌ Error handling amount capturable updated:', error);
      throw error;
    }
  }

  private async handleAccountUpdated(account: any): Promise<void> {
    try {
      console.log(`Account updated: ${account.id}`);

      await PaymentService.handleWebhookEvent({
        type: 'account.updated',
        data: { object: account },
      });

      console.log(
        `Successfully processed account.updated for account ${account.id}`
      );
    } catch (error) {
      console.error('Error handling account updated:', error);
      throw error;
    }
  }

  private async handleTransferCreated(transfer: any): Promise<void> {
    try {
      console.log(
        `Transfer created: ${transfer.id} to ${transfer.destination}`
      );

      console.log({
        transfer_id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        created: transfer.created,
      });
    } catch (error) {
      console.error('Error handling transfer created:', error);
      throw error;
    }
  }

  private async handleTransferUpdated(transfer: any): Promise<void> {
    try {
      console.log(
        `Transfer updated: ${transfer.id} - Status: ${transfer.status}`
      );

      if (transfer.status === 'failed') {
        console.error(
          `Transfer failed: ${transfer.id}`,
          transfer.failure_message
        );

      }
    } catch (error) {
      console.error('Error handling transfer updated:', error);
      throw error;
    }
  }

  private async handlePayoutCreated(payout: any): Promise<void> {
    try {
      console.log(`Payout created: ${payout.id}`);

      console.log({
        payout_id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrival_date: payout.arrival_date,
      });
    } catch (error) {
      console.error('Error handling payout created:', error);
      throw error;
    }
  }

  private async handlePayoutUpdated(payout: any): Promise<void> {
    try {
      console.log(`Payout updated: ${payout.id} - Status: ${payout.status}`);

      if (payout.status === 'failed') {
        console.error(`Payout failed: ${payout.id}`, payout.failure_message);

      } else if (payout.status === 'paid') {
        console.log(`Payout completed: ${payout.id}`);

      }
    } catch (error) {
      console.error('Error handling payout updated:', error);
      throw error;
    }
  }

  private async handleDisputeCreated(dispute: any): Promise<void> {
    try {
      console.log(
        `Dispute created: ${dispute.id} for charge: ${dispute.charge}`
      );

      console.log({
        dispute_id: dispute.id,
        charge_id: dispute.charge,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
      });

      console.warn(
        'DISPUTE ALERT: Manual review required for dispute',
        dispute.id
      );
    } catch (error) {
      console.error('Error handling dispute created:', error);
      throw error;
    }
  }

  webhookHealthCheck = (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      webhook_endpoint: '/api/payment/webhook',
    });
  };
}

export default new WebhookController();
