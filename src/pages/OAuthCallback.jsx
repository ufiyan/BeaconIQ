import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const REDIRECT_URI = "https://app.base44.com/oauth/callback";

export default function OAuthCallback() {
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [error, setError] = useState("");
  const [gmailEmail, setGmailEmail] = useState("");

  const handleCallback = async () => {
    setStatus("loading");
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const workspaceId = params.get("state");
    const errorParam = params.get("error");

    if (errorParam) {
      setError("Google OAuth was denied or cancelled.");
      setStatus("error");
      return;
    }

    if (!code) {
      setError("No authorization code received.");
      setStatus("error");
      return;
    }

    try {
      const res = await base44.functions.invoke("connectGmail", {
        code,
        redirect_uri: REDIRECT_URI,
        workspace_id: workspaceId,
      });

      if (res.data?.success) {
        setGmailEmail(res.data.gmail_email || "");
        setStatus("success");
        // Signal the opener (onboarding modal) and close after short delay
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "GMAIL_CONNECTED", gmail_email: res.data.gmail_email },
            window.location.origin
          );
          setTimeout(() => window.close(), 1500);
        }
      } else {
        setError(res.data?.error || "Failed to connect Gmail.");
        setStatus("error");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xl font-bold"><span className="text-white">Beacon</span><span className="text-amber-400">IQ</span></span>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-1">Connecting Gmail...</h2>
            <p className="text-sm text-muted-foreground">Please wait while we finalize your connection.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Gmail Connected ✓</h2>
            {gmailEmail && <p className="text-sm text-muted-foreground mb-2">{gmailEmail}</p>}
            <p className="text-sm text-muted-foreground">You can close this window and continue setup.</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <Button onClick={handleCallback} className="w-full gap-2">
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>
  );
}