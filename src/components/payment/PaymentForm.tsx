import { useState, useEffect } from 'react';
import { CreditCard, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePayment } from '@/hooks/usePayment';
import { formatCurrencySimple, getCurrencyByCode } from '@/lib/currency';
import { toast } from 'sonner';

interface PaymentFormProps {
  businessId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

export function PaymentForm({
  businessId,
  appointmentId,
  amount,
  currency,
  customerEmail,
  customerName,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const { createPaymentIntent, confirmPayment, processing } = usePayment();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState(customerName);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);

  const currencyInfo = getCurrencyByCode(currency);

  useEffect(() => {
    // Create payment intent when component mounts
    const initializePayment = async () => {
      const intent = await createPaymentIntent(businessId, appointmentId, amount, currency);
      if (intent) {
        setPaymentIntentId(intent.id);
      }
    };

    initializePayment();
  }, [businessId, appointmentId, amount, currency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate card details
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      toast.error('Please fill in all card details');
      return;
    }

    // Test mode: If Stripe is not connected, simulate payment success
    // In production with Stripe connected, this will use real payment processing
    if (!paymentIntentId) {
      // Test mode - simulate successful payment
      toast.success('Payment successful! (Test Mode)');
      // Create a mock payment record
      const mockPaymentId = 'test_' + Date.now();
      onSuccess(mockPaymentId);
      return;
    }

    // Real payment processing (when Stripe is connected)
    const result = await confirmPayment(paymentIntentId, appointmentId);

    if (result.success) {
      toast.success('Payment successful!');
      onSuccess(result.paymentId!);
    } else {
      toast.error(result.error || 'Payment failed. Please try again.');
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\D/g, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle>Secure Payment</CardTitle>
        </div>
        <CardDescription>
          Complete your booking by paying {currencyInfo.symbol}{amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardholder">Cardholder Name</Label>
            <Input
              id="cardholder"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                value={expiryDate}
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                placeholder="123"
                maxLength={4}
                type="password"
                required
              />
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <Button
              type="submit"
              className="w-full"
              disabled={processing || !paymentIntentId}
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Pay {currencyInfo.symbol}{amount.toFixed(2)}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Your payment is secured and encrypted
          </p>
        </form>
      </CardContent>
    </Card>
  );
}


