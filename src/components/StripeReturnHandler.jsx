import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Reads `stripe_status` from the URL on mount and toasts the user. We do NOT
 * trust the success param as proof of payment — the canonical "paid" event is
 * written by the Stripe webhook into the `payment_transactions` Mongo
 * collection. This handler only lets the user know the redirect was received.
 */
export default function StripeReturnHandler() {
  const { toast } = useToast();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("stripe_status");
    if (!status) return;
    setHandled(true);

    // Strip the params from the URL so a refresh doesn't retrigger.
    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    if (status === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charge was made." });
    } else if (status === "success") {
      toast({
        title: "Payment received",
        description:
          "We're confirming your subscription — you'll get an email receipt shortly.",
      });
    }
  }, [handled, toast]);

  return null;
}
