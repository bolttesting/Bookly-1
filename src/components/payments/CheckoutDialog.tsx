import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Lock } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  businessName: string;
  description: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  amount,
  currency,
  businessName,
  description,
  onSuccess,
  onError,
}: CheckoutDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // TODO: Create Stripe Checkout Session
      // This will redirect to Stripe Checkout
      // For now, we'll simulate the flow
      
      // In production, this would call your backend API:
      // const response = await fetch('/api/stripe/create-checkout-session', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     amount,
      //     currency,
      //     businessName,
      //     description,
      //   }),
      // });
      // const { url } = await response.json();
      // window.location.href = url;

      // For now, show a message that backend needs to be configured
      throw new Error('Stripe checkout requires backend API setup. Please configure your Stripe API endpoints.');
    } catch (error: any) {
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle className="font-display">Complete Payment</DialogTitle>
          <DialogDescription>
            You'll be redirected to Stripe to complete your payment securely
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Business</span>
              <span className="font-medium">{businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description</span>
              <span className="font-medium">{description}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total</span>
              <span className="text-primary">
                {formatCurrencySimple(amount, currency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Your payment is secured by Stripe</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleCheckout} disabled={isProcessing} className="gap-2">
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Proceed to Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

