'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, User } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface AvailablePlan {
  weeks: number;
  aiAccess: boolean;
  monthlyTokenLimit: number;
  price: number;
}

interface AvailablePlans {
  free: AvailablePlan;
  pro: AvailablePlan;
  premium: AvailablePlan;
  therapist?: AvailablePlan;
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const planType = searchParams?.get('plan') as 'free' | 'pro' | 'premium' | 'therapist' | null;

  const [availablePlans, setAvailablePlans] = useState<AvailablePlans | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [promotionCode, setPromotionCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean;
    discount_amount?: number;
    final_amount?: number;
    original_amount?: number;
    error?: string;
  } | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  // Payment method options with their fee rates
  const paymentMethods = [
    { id: 'credit_card', name: 'Credit Card', feePercent: 2.9, feeFixed: 2000 },
    { id: 'bank_transfer', name: 'Bank Transfer', feePercent: 0, feeFixed: 4000 },
  ];

  useEffect(() => {
    if (!planType) {
      router.push('/dashboard/profile');
      return;
    }
    fetchAvailablePlans();
    fetchUserPoints();
  }, [planType, router]);

  const fetchUserPoints = async () => {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      if (response.data.success && response.data.data) {
        setUserPoints(response.data.data.points || 0);
      }
    } catch (err) {
      console.error('Failed to fetch user points:', err);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<AvailablePlans>>('/subscriptions/plans');
      if (response.data.success && response.data.data) {
        setAvailablePlans(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch available plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidatePromotionCode = async () => {
    if (!promotionCode.trim() || !planType || !availablePlans) {
      return;
    }

    const plan = availablePlans[planType as keyof AvailablePlans];
    if (!plan) return;

    try {
      setValidatingCode(true);
      const response = await apiClient.post<ApiResponse<any> & { valid?: boolean }>(
        '/promotion-codes/validate',
        {
          code: promotionCode.trim(),
          plan_type: planType,
          amount: plan.price,
        }
      );

      if (response.data.success && (response.data as any).valid) {
        setCodeValidation({
          valid: true,
          discount_amount: response.data.data.discount_amount,
          final_amount: response.data.data.final_amount,
          original_amount: response.data.data.original_amount,
        });
      } else {
        setCodeValidation({
          valid: false,
          error: response.data.error || 'Invalid promotion code',
        });
      }
    } catch (err: any) {
      setCodeValidation({
        valid: false,
        error: err.response?.data?.error || 'Failed to validate promotion code',
      });
    } finally {
      setValidatingCode(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!planType) return;
    
    // Validate payment method is selected (only for paid plans)
    if (finalAmount > 0 && !selectedPaymentMethod) {
      alert('Please select a payment method to continue');
      return;
    }

    try {
      setProcessing(true);
      const payload: any = {
        plan_type: planType,
        message: `Requesting ${planType} subscription`,
      };

      // Include payment method if selected
      if (selectedPaymentMethod) {
        payload.payment_method = selectedPaymentMethod;
      }

      // Include promotion code OR points (mutually exclusive)
      if (promotionCode.trim() && codeValidation?.valid && !usePoints) {
        payload.promotion_code = promotionCode.trim();
      } else if (usePoints && pointsToUse > 0 && !codeValidation?.valid) {
        payload.points_to_use = pointsToUse;
      }

      const response = await apiClient.post<ApiResponse<any>>('/subscriptions/request', payload);

      console.log('Subscription request response:', response.data);

      if (response.data.success) {
        const data = response.data.data;

        // If free plan, show success and redirect
        if (data.activated) {
          alert(
            `Subscription activated!\n\n` +
              `Plan: ${planType.toUpperCase()}\n` +
              `Your free subscription is now active!`
          );
          router.push('/dashboard/profile');
          return;
        }

        // If payment required, redirect to Midtrans
        if (data.requires_payment && data.payment_redirect_url) {
          console.log('Redirecting to Midtrans:', data.payment_redirect_url);
          window.location.href = data.payment_redirect_url;
        } else {
          // Payment creation failed or manual review required
          console.warn('Payment redirect URL missing:', {
            requires_payment: data.requires_payment,
            payment_redirect_url: data.payment_redirect_url,
            payment_token: data.payment_token,
            data: data
          });
          
          if (data.requires_payment && !data.payment_redirect_url) {
            alert(
              `Payment setup failed!\n\n` +
                `Unable to create payment link. Please contact support or try again later.\n\n` +
                `Error: Payment redirect URL not available`
            );
          } else {
            // Manual review required
            alert(
              `Subscription request submitted!\n\n` +
                `Plan: ${planType.toUpperCase()}\n` +
                `An administrator will review and activate your subscription.`
            );
          }
          router.push('/dashboard/profile');
        }
      } else {
        // API returned success: false
        alert(response.data.error || 'Failed to submit subscription request');
      }
    } catch (err: any) {
      console.error('Subscription request error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit subscription request';
      alert(`Error: ${errorMessage}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (!user || user.role !== 'parent') {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-red-600">Access denied. Parents only.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading || !planType || !availablePlans) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">Loading checkout...</div>
        </div>
      </DashboardLayout>
    );
  }

  const plan = availablePlans[planType as keyof AvailablePlans];
  if (!plan) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p className="text-red-600">Invalid plan selected</p>
          <Link href="/dashboard/profile">
            <Button className="mt-4">Back to Profile</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate discounts
  const originalAmount = plan.price;
  
  // Points and promotion codes are mutually exclusive
  const promotionDiscount = codeValidation?.valid && !usePoints ? codeValidation.discount_amount || 0 : 0;
  const pointsDiscount = usePoints && !codeValidation?.valid && pointsToUse > 0 ? Math.min(pointsToUse, originalAmount) : 0;
  
  const finalAmount = Math.max(0, originalAmount - promotionDiscount - pointsDiscount);
  const totalDiscount = promotionDiscount + pointsDiscount;
  
  // Calculate fee based on selected payment method
  const calculateFee = (method: typeof paymentMethods[number] | null, amount: number): number => {
    if (!method || amount === 0) return 0;
    const percentageFee = method.feePercent > 0 
      ? Math.ceil((amount * method.feePercent) / 100)
      : 0;
    return percentageFee + method.feeFixed;
  };

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethod) || null;
  const adminFee = calculateFee(selectedMethod, finalAmount);
  const totalAmount = finalAmount + adminFee;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/profile" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="text-gray-600 mt-1">Review your subscription plan and apply promotion code</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

              {/* Plan Details */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">{planType} Plan</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {plan.weeks} {plan.weeks === 1 ? 'Week' : 'Weeks'} subscription
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                      <li className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Full access to create and edit logs</span>
                      </li>
                      <li className="flex items-start">
                        <svg
                          className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>Manage children and goals</span>
                      </li>
                      {plan.aiAccess ? (
                        <li className="flex items-start">
                          <svg
                            className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span>AI Features ({plan.monthlyTokenLimit.toLocaleString()} tokens/month)</span>
                        </li>
                      ) : (
                        <li className="flex items-start">
                          <svg
                            className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          <span className="text-gray-400">No AI Features</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{formatPrice(originalAmount)}</div>
                  </div>
                </div>
              </div>

              {/* Promotion Code */}
              <div className="mb-4">
                <label htmlFor="promotion_code" className="block text-sm font-medium text-gray-700 mb-2">
                  Promotion Code {usePoints && <span className="text-gray-500 text-xs">(Cannot use with points)</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="promotion_code"
                    value={promotionCode}
                    onChange={(e) => {
                      setPromotionCode(e.target.value.toUpperCase());
                      setCodeValidation(null);
                      // Clear points usage when promotion code is entered
                      if (e.target.value.trim() && usePoints) {
                        setUsePoints(false);
                        setPointsToUse(0);
                      }
                    }}
                    placeholder="Enter promotion code (e.g., SUMMER2024)"
                    disabled={usePoints}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      usePoints ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <Button
                    onClick={handleValidatePromotionCode}
                    disabled={!promotionCode.trim() || validatingCode || usePoints}
                    variant="outline"
                  >
                    {validatingCode ? 'Validating...' : 'Apply'}
                  </Button>
                </div>
                {usePoints && (
                  <p className="mt-2 text-xs text-gray-500">
                    Promotion codes cannot be used when points are applied. Uncheck &quot;Use my points&quot; to use a promotion code.
                  </p>
                )}
                {codeValidation && (
                  <div
                    className={`mt-2 text-sm ${
                      codeValidation.valid ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {codeValidation.valid ? (
                      <div>
                        <span className="font-medium">✓ Discount applied!</span>
                        {codeValidation.original_amount &&
                          codeValidation.discount_amount &&
                          codeValidation.final_amount && (
                            <div className="mt-1">
                              You save {formatPrice(codeValidation.discount_amount)}!
                            </div>
                          )}
                      </div>
                    ) : (
                      <span>{codeValidation.error}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Points Usage */}
              {userPoints > 0 && (
                <div className={`mb-4 p-4 border rounded-lg ${
                  codeValidation?.valid 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start mb-3">
                    <input
                      type="checkbox"
                      id="use_points"
                      checked={usePoints}
                      onChange={(e) => {
                        setUsePoints(e.target.checked);
                        if (e.target.checked) {
                          // Clear promotion code when points are used
                          setPromotionCode('');
                          setCodeValidation(null);
                          // Auto-set to max available points, but not more than the original amount
                          setPointsToUse(Math.min(userPoints, originalAmount));
                        } else {
                          setPointsToUse(0);
                        }
                      }}
                      disabled={!!codeValidation?.valid}
                      className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1 ${
                        codeValidation?.valid ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    />
                    <label htmlFor="use_points" className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Use my points ({userPoints.toLocaleString()} points available)
                        {codeValidation?.valid && <span className="text-gray-500 text-xs ml-2">(Cannot use with promotion code)</span>}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        1 point = 1 IDR. You can use up to {formatPrice(Math.min(userPoints, originalAmount))} worth of points.
                      </div>
                    </label>
                  </div>
                  {codeValidation?.valid && (
                    <p className="mt-2 text-xs text-gray-500">
                      Points cannot be used when a promotion code is applied. Remove the promotion code to use points.
                    </p>
                  )}
                  {usePoints && (
                    <div className="mt-3">
                      <label htmlFor="points_amount" className="block text-sm font-medium text-gray-700 mb-2">
                        Points to use
                      </label>
                      <input
                        type="number"
                        id="points_amount"
                        min={0}
                        max={Math.min(userPoints, originalAmount)}
                        value={pointsToUse}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const maxPoints = Math.min(userPoints, originalAmount);
                          setPointsToUse(Math.max(0, Math.min(value, maxPoints)));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPointsToUse(Math.min(userPoints, originalAmount))}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Use maximum ({Math.min(userPoints, originalAmount).toLocaleString()} points)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPointsToUse(0)}
                          className="text-xs text-gray-600 hover:text-gray-800 underline"
                        >
                          Clear
                        </button>
                      </div>
                      {pointsToUse > 0 && (
                        <div className="mt-2 text-sm text-green-700">
                          <span className="font-medium">✓ {formatPrice(pointsToUse)} discount will be applied</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment Method Selection - Only show for paid plans */}
              {finalAmount > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Payment Method</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose your preferred payment method. The processing fee will vary based on your selection.
                  </p>
                  <div className="space-y-2">
                    {paymentMethods.map((method) => {
                      const methodFee = calculateFee(method, finalAmount);
                      const isSelected = selectedPaymentMethod === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.id}
                            checked={isSelected}
                            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-base font-medium text-gray-900">{method.name}</span>
                                <div className="text-sm text-gray-500 mt-1">
                                  Fee: {method.feePercent > 0 && method.feeFixed > 0
                                    ? `${method.feePercent}% + ${formatPrice(method.feeFixed)}`
                                    : method.feePercent > 0
                                    ? `${method.feePercent}%`
                                    : formatPrice(method.feeFixed)}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="text-right">
                                  <div className="text-sm text-blue-600 font-medium">
                                    Fee: {formatPrice(methodFee)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Total: {formatPrice(finalAmount + methodFee)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {!selectedPaymentMethod && (
                    <p className="text-sm text-red-600 mt-3">
                      Please select a payment method to continue
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(originalAmount)}</span>
                </div>
                {promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Promotion Discount</span>
                    <span className="text-green-600 font-medium">-{formatPrice(promotionDiscount)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-600">Points Discount ({pointsToUse.toLocaleString()} pts)</span>
                    <span className="text-blue-600 font-medium">-{formatPrice(pointsDiscount)}</span>
                  </div>
                )}
                {finalAmount > 0 && (
                  <>
                    {/* Payment Summary */}
                    <div className="border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-900">{formatPrice(finalAmount)}</span>
                      </div>
                      {selectedPaymentMethod && adminFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payment Processing Fee</span>
                          <span className="text-gray-900">{formatPrice(adminFee)}</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-3 flex justify-between">
                        <span className="text-base font-semibold text-gray-900">Total</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {selectedPaymentMethod ? formatPrice(totalAmount) : formatPrice(finalAmount)}
                        </span>
                      </div>
                      {!selectedPaymentMethod && (
                        <p className="text-xs text-red-600 mt-2">
                          Please select a payment method to see the total amount
                        </p>
                      )}
                    </div>
                  </>
                )}
                {finalAmount === 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm text-gray-600 text-center">
                      No payment required for free plan
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleProceedToPayment}
                disabled={processing || (plan.price === 0 && !codeValidation?.valid) || (finalAmount > 0 && !selectedPaymentMethod)}
                className="w-full"
                size="lg"
              >
                {processing
                  ? 'Processing...'
                  : plan.price === 0
                  ? 'Activate Free Plan'
                  : 'Proceed to Payment'}
              </Button>

              {plan.price > 0 && (
                <p className="mt-3 text-xs text-gray-500 text-center">
                  You will be redirected to Midtrans for secure payment
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">Loading checkout...</div>
        </div>
      </DashboardLayout>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}

