/**
 * Payment fee calculation utility based on Midtrans payment methods
 * Reference: https://docs.midtrans.com/docs/how-much-does-midtrans-charge-for-its-payment-service
 */

import { logger } from './logger.js';

export interface PaymentMethodFeeConfig {
  percentage: number; // Percentage fee (0-100)
  fixed: number; // Fixed fee in IDR
}

/**
 * Payment method fee configurations based on Midtrans pricing
 * Note: Fees may vary based on merchant agreement
 */
export const PAYMENT_METHOD_FEES: Record<string, PaymentMethodFeeConfig> = {
  // Bank Transfer
  'bank_transfer': { percentage: 0, fixed: 4000 }, // Rp 4,000 per transaction
  'bca': { percentage: 0, fixed: 4000 },
  'bni': { percentage: 0, fixed: 4000 },
  'permata': { percentage: 0, fixed: 4000 },
  'mandiri': { percentage: 0, fixed: 4000 },
  
  // E-Wallet
  'gopay': { percentage: 2.0, fixed: 0 }, // 2% per transaction
  'shopeepay': { percentage: 2.0, fixed: 0 },
  'dana': { percentage: 1.5, fixed: 0 }, // 1.5% per transaction
  'ovo': { percentage: 1.5, fixed: 0 },
  'linkaja': { percentage: 1.5, fixed: 0 },
  
  // QRIS
  'qris': { percentage: 0.7, fixed: 0 }, // 0.7% per transaction
  
  // Credit Card
  'credit_card': { percentage: 2.9, fixed: 2000 }, // 2.9% + Rp 2,000
  'visa': { percentage: 2.9, fixed: 2000 },
  'mastercard': { percentage: 2.9, fixed: 2000 },
  
  // Minimarket
  'cstore': { percentage: 0, fixed: 5000 }, // Rp 5,000 (Alfamart, Alfamidi, DAN+DAN)
  'indomaret': { percentage: 0, fixed: 1000 }, // Rp 1,000 + partner fee
  'alfamart': { percentage: 0, fixed: 5000 },
  'alfamidi': { percentage: 0, fixed: 5000 },
  
  // PayLater
  'akulaku': { percentage: 1.7, fixed: 0 }, // 1.7% per transaction
  'kredivo': { percentage: 2.0, fixed: 0 }, // 2% per transaction
};

/**
 * Calculate payment fee based on payment method and transaction amount
 * @param paymentMethod - Payment method type from Midtrans (e.g., 'gopay', 'credit_card', 'bank_transfer.bca')
 * @param amount - Transaction amount in IDR
 * @returns Calculated fee in IDR
 */
export function calculatePaymentFee(paymentMethod: string, amount: number): number {
  if (!paymentMethod) {
    // Default to highest fee if payment method not provided
    return Math.ceil((amount * 2.9) / 100) + 2000; // Credit card fee
  }
  
  const method = paymentMethod.toLowerCase();
  
  // Handle payment methods with sub-types (e.g., 'bank_transfer.bca', 'credit_card.visa')
  // Extract the main payment type (part before the dot)
  const mainType = method.split('.')[0];
  
  // Try exact match first
  let feeConfig = PAYMENT_METHOD_FEES[method];
  
  // If not found, try main type
  if (!feeConfig) {
    feeConfig = PAYMENT_METHOD_FEES[mainType];
  }
  
  if (!feeConfig) {
    // Default to highest fee (credit card) if payment method not found
    logger.warn({ paymentMethod: method, mainType }, 'Unknown payment method, using default fee (credit card)');
    return Math.ceil((amount * 2.9) / 100) + 2000; // Credit card fee (highest)
  }
  
  // Calculate percentage fee
  const percentageFee = feeConfig.percentage > 0 
    ? Math.ceil((amount * feeConfig.percentage) / 100)
    : 0;
  
  // Add fixed fee
  const totalFee = percentageFee + feeConfig.fixed;
  
  return totalFee;
}

/**
 * Get estimated fee for checkout display
 * Returns the highest fee percentage to ensure we cover all payment methods
 * @param amount - Transaction amount in IDR
 * @returns Estimated fee in IDR (worst case: credit card)
 */
export function getEstimatedFee(amount: number): number {
  // Use credit card fee (highest) as estimate: 2.9% + Rp 2,000
  return Math.ceil((amount * 2.9) / 100) + 2000;
}

/**
 * Get fee range for display
 * @param amount - Transaction amount in IDR
 * @returns Object with min and max fee estimates
 */
export function getFeeRange(amount: number): { min: number; max: number } {
  // Minimum: QRIS (0.7%)
  const minFee = Math.ceil((amount * 0.7) / 100);
  
  // Maximum: Credit Card (2.9% + Rp 2,000)
  const maxFee = Math.ceil((amount * 2.9) / 100) + 2000;
  
  return { min: minFee, max: maxFee };
}
