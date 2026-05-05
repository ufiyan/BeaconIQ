import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 8;

/**
 * Reads `stripe_status` and `session_id` from the URL on mount, polls the
 * backend for the final payment status, and toasts the user. Returns nothing
 * — purely a side-effect component meant to live near the top of the page.
 */
export default function StripeReturnHandler() {
  const { toast } = useToast();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    if (handled) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("stripe_status");
    const sessionId = params.get("session_id");

    if (!status) return;
    setHandled(true);

    // Strip the params from the URL so a refresh doesn't retrigger.
    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);

    if (status === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No charge was made." });
      return;
    }

    if (status !== "success" || !sessionId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/payments/checkout/status/${sessionId}`);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = await res.json();

        if (data.payment_status === "paid") {
          const planLabel = data?.metadata?.package_name || "your plan";
          toast({
            title: "Payment successful",
            description: `Welcome to BeaconIQ ${planLabel}.`,
          });
          return;
        }
        if (data.status === "expired") {
          toast({
            title: "Checkout expired",
            description: "The session expired before payment completed.",
            variant: "destructive",
          });
          return;
        }
        if (attempts >= MAX_ATTEMPTS) {
          toast({
            title: "Still processing",
            description:
              "Payment is taking longer than usual — we'll email a receipt once it clears.",
          });
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (err) {
        console.error("[stripe] status poll error:", err);
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          toast({
            title: "Could not confirm payment",
            description: "Please refresh the page to try again.",
            variant: "destructive",
          });
        }
      }
    };

    toast({ title: "Confirming your payment…" });
    poll();

    return () => {
      cancelled = true;
    };
  }, [handled, toast]);

  return null;
}
