"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const payment_service_1 = __importDefault(require("./payment.service"));
const http_status_1 = __importDefault(require("http-status"));
const stripe_1 = require("../../../config/stripe");
class WebhookController {
    constructor() {

        this.handleStripeWebhook = (req, res) => __awaiter(this, void 0, void 0, function* () {

            const sig = req.headers['stripe-signature'];
            const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
            if (!endpointSecret) {
                console.error('❌ Stripe webhook secret not configured');
                return res.status(http_status_1.default.INTERNAL_SERVER_ERROR).json({
                    error: 'Webhook secret not configured',
                });
            }
            res.locals.webhookSecretPreview =
                endpointSecret.substring(0, 10) + '...';
            let event;
            try {

                event = stripe_1.stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

                res.locals.webhookSignatureVerified = true;
            }
            catch (err) {
                console.error('❌ Webhook signature verification failed:', {
                    error: err.message,
                    signature: sig ? sig.substring(0, 20) + '...' : 'No signature',
                    bodyLength: req.body ? req.body.length : 0,
                });

                res.locals.webhookSignatureVerified = false;
                res.locals.webhookSignatureError =
                    (err === null || err === void 0 ? void 0 : err.message) || 'unknown error';
                return res.status(http_status_1.default.BAD_REQUEST).json({
                    error: `Webhook Error: ${err.message}`,
                });
            }

            try {

                switch (event.type) {
                    case 'payment_intent.succeeded':
                        yield this.handlePaymentSucceeded(event.data.object);
                        break;
                    case 'payment_intent.payment_failed':
                        yield this.handlePaymentFailed(event.data.object);
                        break;
                    case 'payment_intent.canceled':
                        yield this.handlePaymentCanceled(event.data.object);
                        break;
                    case 'payment_intent.amount_capturable_updated':
                        yield this.handleAmountCapturableUpdated(event.data.object);
                        break;
                    case 'account.updated':
                        yield this.handleAccountUpdated(event.data.object);
                        break;
                    case 'transfer.created':
                        yield this.handleTransferCreated(event.data.object);
                        break;
                    case 'transfer.updated':
                        yield this.handleTransferUpdated(event.data.object);
                        break;
                    case 'payout.created':
                        yield this.handlePayoutCreated(event.data.object);
                        break;
                    case 'payout.updated':
                        yield this.handlePayoutUpdated(event.data.object);
                        break;
                    case 'charge.dispute.created':
                        yield this.handleDisputeCreated(event.data.object);
                        break;
                    default:
                        console.log(`Unhandled event type: ${event.type}`);
                }

                res.json({ received: true });
            }
            catch (error) {
                console.error(`Error processing webhook event ${event.type}:`, error);
                res.status(http_status_1.default.INTERNAL_SERVER_ERROR).json({
                    error: 'Failed to process webhook event',
                });
            }
        });

        this.webhookHealthCheck = (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                webhook_endpoint: '/api/payment/webhook',
            });
        };
    }

    handlePaymentSucceeded(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {

                const bidId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.bid_id;
                if (!bidId) {
                    console.error('❌ No bid_id found in payment intent metadata:', paymentIntent.metadata);
                    return;
                }
                console.log('🎯 Processing payment for bid:', bidId);

                yield payment_service_1.default.handleWebhookEvent({
                    type: 'payment_intent.succeeded',
                    data: { object: paymentIntent },
                });
                console.log('✅ Successfully processed payment_intent.succeeded for bid:', bidId);
            }
            catch (error) {
                console.error('❌ Error handling payment succeeded:', error);
                throw error;
            }
        });
    }

    handlePaymentFailed(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`Payment failed: ${paymentIntent.id}`);
                const bidId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.bid_id;
                if (!bidId) {
                    console.error('No bid_id found in payment intent metadata');
                    return;
                }

                yield payment_service_1.default.handleWebhookEvent({
                    type: 'payment_intent.payment_failed',
                    data: { object: paymentIntent },
                });
                console.log(`Successfully processed payment_intent.payment_failed for bid ${bidId}`);
            }
            catch (error) {
                console.error('Error handling payment failed:', error);
                throw error;
            }
        });
    }

    handlePaymentCanceled(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log(`Payment canceled: ${paymentIntent.id}`);
                const bidId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.bid_id;
                if (!bidId) {
                    console.error('No bid_id found in payment intent metadata');
                    return;
                }

                yield payment_service_1.default.handleWebhookEvent({
                    type: 'payment_intent.payment_failed',
                    data: { object: paymentIntent },
                });
                console.log(`Successfully processed payment_intent.canceled for bid ${bidId}`);
            }
            catch (error) {
                console.error('Error handling payment canceled:', error);
                throw error;
            }
        });
    }

    handleAmountCapturableUpdated(paymentIntent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {

                const bidId = (_a = paymentIntent.metadata) === null || _a === void 0 ? void 0 : _a.bid_id;
                if (!bidId) {
                    console.error('❌ No bid_id found in payment intent metadata:', paymentIntent.metadata);
                    return;
                }

                yield payment_service_1.default.handleWebhookEvent({
                    type: 'payment_intent.amount_capturable_updated',
                    data: { object: paymentIntent },
                });

            }
            catch (error) {
                console.error('❌ Error handling amount capturable updated:', error);
                throw error;
            }
        });
    }

    handleAccountUpdated(account) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Account updated: ${account.id}`);

                yield payment_service_1.default.handleWebhookEvent({
                    type: 'account.updated',
                    data: { object: account },
                });
                console.log(`Successfully processed account.updated for account ${account.id}`);
            }
            catch (error) {
                console.error('Error handling account updated:', error);
                throw error;
            }
        });
    }

    handleTransferCreated(transfer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Transfer created: ${transfer.id} to ${transfer.destination}`);

                console.log({
                    transfer_id: transfer.id,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    destination: transfer.destination,
                    created: transfer.created,
                });
            }
            catch (error) {
                console.error('Error handling transfer created:', error);
                throw error;
            }
        });
    }

    handleTransferUpdated(transfer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Transfer updated: ${transfer.id} - Status: ${transfer.status}`);

                if (transfer.status === 'failed') {
                    console.error(`Transfer failed: ${transfer.id}`, transfer.failure_message);

                }
            }
            catch (error) {
                console.error('Error handling transfer updated:', error);
                throw error;
            }
        });
    }

    handlePayoutCreated(payout) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Payout created: ${payout.id}`);

                console.log({
                    payout_id: payout.id,
                    amount: payout.amount,
                    currency: payout.currency,
                    status: payout.status,
                    arrival_date: payout.arrival_date,
                });
            }
            catch (error) {
                console.error('Error handling payout created:', error);
                throw error;
            }
        });
    }

    handlePayoutUpdated(payout) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Payout updated: ${payout.id} - Status: ${payout.status}`);

                if (payout.status === 'failed') {
                    console.error(`Payout failed: ${payout.id}`, payout.failure_message);

                }
                else if (payout.status === 'paid') {
                    console.log(`Payout completed: ${payout.id}`);

                }
            }
            catch (error) {
                console.error('Error handling payout updated:', error);
                throw error;
            }
        });
    }

    handleDisputeCreated(dispute) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`Dispute created: ${dispute.id} for charge: ${dispute.charge}`);

                console.log({
                    dispute_id: dispute.id,
                    charge_id: dispute.charge,
                    amount: dispute.amount,
                    currency: dispute.currency,
                    reason: dispute.reason,
                    status: dispute.status,
                });

                console.warn('DISPUTE ALERT: Manual review required for dispute', dispute.id);
            }
            catch (error) {
                console.error('Error handling dispute created:', error);
                throw error;
            }
        });
    }
}
exports.default = new WebhookController();
