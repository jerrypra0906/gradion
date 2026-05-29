import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { SubscriptionPlan } from '@prisma/client';
import crypto from 'crypto';

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  planType: SubscriptionPlan;
  paymentMethod?: string; // Selected payment method (e.g., 'gopay', 'credit_card')
}

export interface PaymentResponse {
  token: string;
  redirectUrl: string;
  orderId: string;
}

export class PaymentService {
  private isAvailable: boolean;
  private snapApiUrl: string;

  constructor() {
    this.isAvailable = !!config.payment.midtransServerKey;
    
    // Set API URL based on environment
    if (config.payment.midtransIsProduction) {
      this.snapApiUrl = 'https://app.midtrans.com/snap/v1';
    } else {
      this.snapApiUrl = 'https://app.sandbox.midtrans.com/snap/v1';
    }

    if (this.isAvailable) {
      logger.info({
        isProduction: config.payment.midtransIsProduction,
        apiUrl: this.snapApiUrl,
        hasServerKey: !!config.payment.midtransServerKey,
        serverKeyPrefix: config.payment.midtransServerKey?.substring(0, 15) + '...',
      }, `Payment service initialized with Midtrans - API URL: ${this.snapApiUrl}, Production: ${config.payment.midtransIsProduction}`);
    } else {
      logger.warn('Payment service: MIDTRANS_SERVER_KEY not configured. Payment features will be disabled.');
    }
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    if (!this.isAvailable || !config.payment.midtransServerKey) {
      throw new Error('Payment service not configured. Please set MIDTRANS_SERVER_KEY.');
    }

    try {
      const parameter: any = {
        transaction_details: {
          order_id: params.orderId,
          gross_amount: params.amount,
        },
        customer_details: {
          first_name: params.customerName.split(' ')[0] || params.customerName,
          last_name: params.customerName.split(' ').slice(1).join(' ') || '',
          email: params.customerEmail,
          phone: params.customerPhone || '',
        },
        item_details: [
          {
            id: `subscription-${params.planType}`,
            price: params.amount,
            quantity: 1,
            name: `Subscription Plan - ${params.planType.toUpperCase()}`,
            category: 'Subscription',
          },
        ],
        callbacks: {
          finish: `${config.frontendUrl}/dashboard/profile?payment=success`,
          error: `${config.frontendUrl}/dashboard/profile?payment=error`,
          pending: `${config.frontendUrl}/dashboard/profile?payment=pending`,
        },
      };

      // If payment method is specified, only enable that payment method
      // This way customer only sees their selected method on Midtrans page
      if (params.paymentMethod) {
        // Map our payment method IDs to Midtrans payment method codes
        const paymentMethodMap: Record<string, string> = {
          'qris': 'qris',
          'gopay': 'gopay',
          'shopeepay': 'shopeepay',
          'dana': 'dana',
          'credit_card': 'credit_card',
          'bank_transfer': 'bank_transfer',
          'cstore': 'cstore',
        };
        
        const midtransPaymentMethod = paymentMethodMap[params.paymentMethod];
        if (midtransPaymentMethod) {
          parameter.enabled_payments = [midtransPaymentMethod];
          logger.info({ 
            selectedMethod: params.paymentMethod,
            midtransMethod: midtransPaymentMethod 
          }, 'Payment method specified, limiting to selected method');
        }
      }

      logger.info({ 
        orderId: params.orderId, 
        amount: params.amount,
        apiUrl: this.snapApiUrl,
        serverKeyPrefix: config.payment.midtransServerKey?.substring(0, 15) + '...',
        isProduction: config.payment.midtransIsProduction
      }, `Creating Midtrans payment transaction - URL: ${this.snapApiUrl}, Production: ${config.payment.midtransIsProduction}`);

      // Validate server key format
      if (!config.payment.midtransServerKey) {
        throw new Error('MIDTRANS_SERVER_KEY is not set. Please configure it in environment variables.');
      }

      // Check if server key format matches environment
      // Note: Some Midtrans Sandbox accounts may have keys starting with "Mid-server-" instead of "SB-Mid-server-"
      // The key format alone is not a reliable indicator - we rely on MIDTRANS_IS_PRODUCTION setting
      const isSandboxKey = config.payment.midtransServerKey.startsWith('SB-Mid-server-');
      const isProductionKey = config.payment.midtransServerKey.startsWith('Mid-server-');
      
      if (!isSandboxKey && !isProductionKey) {
        logger.warn({ 
          keyPrefix: config.payment.midtransServerKey.substring(0, 20) + '...' 
        }, 'Server key format may be incorrect. Sandbox keys typically start with "SB-Mid-server-", Production keys start with "Mid-server-"');
      }

      // Only warn about format mismatch, don't throw error
      // Some Sandbox accounts use "Mid-server-" prefix, so format alone isn't reliable
      if (config.payment.midtransIsProduction && isSandboxKey) {
        logger.warn('Server key starts with "SB-Mid-server-" but MIDTRANS_IS_PRODUCTION is true. This may cause authentication issues.');
      }

      if (!config.payment.midtransIsProduction && isProductionKey) {
        logger.info('Server key starts with "Mid-server-" but MIDTRANS_IS_PRODUCTION is false. This is normal for some Sandbox accounts.');
      }

      // Trim any whitespace from server key (common issue)
      const serverKey = config.payment.midtransServerKey.trim();
      
      // Log key details (first 15 chars only for security)
      logger.info({ 
        keyLength: serverKey.length,
        rawKeyLength: config.payment.midtransServerKey.length,
        keyPrefix: serverKey.substring(0, 15) + '...',
        hasWhitespace: serverKey !== config.payment.midtransServerKey,
        isSandboxKey: serverKey.startsWith('SB-Mid-server-'),
        isProductionKey: serverKey.startsWith('Mid-server-'),
        environmentIsProduction: config.payment.midtransIsProduction,
        apiUrl: this.snapApiUrl
      }, 'Using server key for authentication');

      // Validate key format before making request
      if (!serverKey.startsWith('SB-Mid-server-') && !serverKey.startsWith('Mid-server-')) {
        throw new Error(
          `Invalid server key format. ` +
          `Expected to start with "SB-Mid-server-" (sandbox) or "Mid-server-" (production). ` +
          `Got: "${serverKey.substring(0, 20)}..."`
        );
      }

      // Note: Key length can vary. Some keys are 35 characters, others are 40-50.
      // The important thing is that it matches the environment (sandbox vs production API URL).
      if (serverKey.length < 30 || serverKey.length > 60) {
        logger.warn({ 
          keyLength: serverKey.length,
          keyPrefix: serverKey.substring(0, 15) + '...'
        }, 'Server key length is unusual. Expected 30-60 characters. Please verify the key is complete.');
      }

      // Create authorization header (Base64 encode server key)
      const authString = Buffer.from(serverKey + ':').toString('base64');
      
      // Log auth header prefix for debugging (first 20 chars of base64)
      logger.debug({ 
        authHeaderPrefix: authString.substring(0, 20) + '...',
        authHeaderLength: authString.length
      }, 'Authorization header created');

      // Make HTTP request to Midtrans Snap API
      const response = await fetch(`${this.snapApiUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify(parameter),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ 
          status: response.status, 
          statusText: response.statusText,
          error: errorText,
          orderId: params.orderId,
          apiUrl: this.snapApiUrl,
          serverKeyPrefix: config.payment.midtransServerKey?.substring(0, 15) + '...',
          isProduction: config.payment.midtransIsProduction
        }, `Midtrans API error - Status: ${response.status}, URL: ${this.snapApiUrl}, Error: ${errorText.substring(0, 200)}`);
        
        // Provide helpful error message for 401
        if (response.status === 401) {
          const errorObj = JSON.parse(errorText || '{}');
          throw new Error(
            `Midtrans authentication failed (401 Unauthorized). ` +
            `Please check:\n` +
            `1. MIDTRANS_SERVER_KEY is set correctly in Railway environment variables\n` +
            `2. Server key matches environment (sandbox vs production)\n` +
            `3. Server key format is correct (sandbox: "SB-Mid-server-...", production: "Mid-server-...")\n` +
            `4. MIDTRANS_IS_PRODUCTION matches your key type\n` +
            `Error: ${errorObj.error_messages?.[0] || errorText}`
          );
        }
        
        throw new Error(`Midtrans API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const transaction = await response.json() as {
        token?: string;
        redirect_url?: string;
      };

      if (!transaction.token || !transaction.redirect_url) {
        logger.error({ transaction }, 'Invalid response from Midtrans API');
        throw new Error('Invalid response from Midtrans: missing token or redirect_url');
      }

      logger.info({ 
        orderId: params.orderId, 
        token: transaction.token.substring(0, 20) + '...' 
      }, 'Midtrans payment transaction created successfully');

      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
        orderId: params.orderId,
      };
    } catch (error: any) {
      logger.error({ error, params }, 'Failed to create Midtrans payment');
      throw new Error(`Failed to create payment: ${error.message || 'Unknown error'}`);
    }
  }

  verifyWebhook(data: any, signature: string): boolean {
    if (!config.payment.midtransWebhookSecret) {
      logger.warn('Midtrans webhook secret not configured. Skipping verification in development.');
      // In development, allow webhooks without verification
      // In production, always verify
      return !config.payment.midtransIsProduction;
    }

    try {
      // Midtrans webhook signature verification
      // Note: Midtrans uses order_id + status_code + gross_amount + server_key for verification
      // However, the actual signature format may vary. Check Midtrans docs for latest format.
      const hash = crypto
        .createHash('sha512')
        .update(data.order_id + data.status_code + data.gross_amount + config.payment.midtransWebhookSecret)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        logger.warn({ 
          orderId: data.order_id,
          expectedHash: hash.substring(0, 20) + '...',
          receivedHash: signature.substring(0, 20) + '...'
        }, 'Webhook signature verification failed');
      } else {
        logger.info({ orderId: data.order_id }, 'Webhook signature verified successfully');
      }

      return isValid;
    } catch (error: any) {
      logger.error({ error }, 'Error verifying webhook signature');
      return false;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
