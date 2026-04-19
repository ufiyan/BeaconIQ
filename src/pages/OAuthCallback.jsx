import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, TrendingUp, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOAuthRedirectUri } from "@/lib/oauthRedirect";

const UNVERIFIED_APP_ERRORS = ["access_denied", "admin_policy_enforced"];

export default function OAuthCallback() {
  const [status, setStatus] = useState("loading"); // loading | success | error | no_code
  const [error, setError] = useState("");
  const [errorParam, setErrorParam] = useState("");
  const [gmailEmail, setGmailEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const redirectUri = getOAuthRedirectUri();

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCallback = async () => {
    setStatus("loading");
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const workspaceId = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setErrorParam(oauthError);
      setError(
        oauthError === "access_denied"
          ? "You declined to grant access, or Google blocked the request."
          : `Google returned an error: ${oauthError}`
      );
      setStatus("error");
      return;
    }

    if (!code) {
      setStatus("no_code");
      return;
    }

    try {
      const res = await base44.functions.invoke("connectGmail", {
        code,
        redirect_uri: redirectUri,
        workspace_id: workspaceId,
      });

      if (res.data?.success) {
        setGmailEmail(res.data.gmail_email || "");
        setStatus("success");
        // Signal opener (onboarding modal) and close after short delay
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "GMAIL_CONNECTED", gmail_email: res.data.gmail_email },
            window.location.origin
          );
          setTimeout(() => window.close(), 2000);
        }
      } else {
        setError(res.data?.error || "Failed to connect Gmail. Check that your Google Cloud redirect URI matches exactly.");
        setStatus("error");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred during token exchange.");
      setStatus("error");
    }
  };

  useEffect(() => {
    handleCallback();
  }, []);

  const isUnverifiedAppError = UNVERIFIED_APP_ERRORS.includes(errorParam);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xl font-bold"><span className="text-white">Beacon</span><span className="text-amber-400">IQ</span></span>
        </div>

        {/* LOADING */}
        {status === "loading" && (
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-1">Connecting Gmail...</h2>
            <p className="text-sm text-muted-foreground">Exchanging authorization code — please wait.</p>
          </div>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Gmail Connected ✓</h2>
            {gmailEmail && <p className="text-sm text-muted-foreground mb-1">{gmailEmail}</p>}
            <p className="text-sm text-muted-foreground">You can close this window and continue setup.</p>
          </div>
        )}

        {/* NO CODE — redirect URI mismatch or cancelled */}
        {status === "no_code" && (
          <div>
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2 text-center">Authorization Code Not Found</h2>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Google did not return an authorization code. This is usually caused by one of the following:
            </p>
            <ul className="space-y-2 mb-5">
              {[
                "Redirect URI mismatch — the URI in your Google Cloud Console doesn't match the one below",
                "The authorization attempt expired — try connecting again",
                "You cancelled the consent screen",
                "You navigated here directly (not via the Gmail connect flow)",
              ].map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 text-amber-400 flex-shrink-0">•</span>
                  {reason}
                </li>
              ))}
            </ul>
            <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <p className="text-xs text-muted-foreground mb-1.5">Add this exact URI to Google Cloud Console → OAuth → Authorized Redirect URIs:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-blue-300 flex-1 break-all">{redirectUri}</code>
                <button onClick={copyRedirectUri} className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {copied && <p className="text-xs text-green-400 mt-1">Copied!</p>}
            </div>
            <Button onClick={() => window.close()} variant="outline" className="w-full">Close Window</Button>
          </div>
        )}

        {/* OAUTH ERROR */}
        {status === "error" && (
          <div>
            <div className="w-16 h-16 bg-destructive/10 border border-destructive/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2 text-center">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mb-4 text-center">{error}</p>

            {/* Unverified app guidance */}
            {isUnverifiedAppError && (
              <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
                <p className="text-xs font-semibold text-amber-400 mb-2">⚠ "Google hasn't verified this app"</p>
                <p className="text-xs text-muted-foreground mb-2">
                  This warning appears when the Google OAuth consent screen is in <strong className="text-white">Testing</strong> mode (not yet verified by Google). To connect successfully:
                </p>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5"><span className="text-amber-400 flex-shrink-0">1.</span>Go to <strong className="text-white">Google Cloud Console → OAuth consent screen</strong></li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400 flex-shrink-0">2.</span>Under <strong className="text-white">Test users</strong>, add the Gmail address you want to connect</li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400 flex-shrink-0">3.</span>Then try connecting again — test users can bypass the unverified warning</li>
                  <li className="flex items-start gap-1.5"><span className="text-amber-400 flex-shrink-0">4.</span>For production, submit your app for Google verification</li>
                </ul>
              </div>
            )}

            {/* General token exchange errors — show redirect URI hint */}
            {!isUnverifiedAppError && (
              <div className="rounded-lg p-3 mb-4" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <p className="text-xs text-muted-foreground mb-1.5">Expected redirect URI (must match Google Cloud Console exactly):</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-blue-300 flex-1 break-all">{redirectUri}</code>
                  <button onClick={copyRedirectUri} className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                {copied && <p className="text-xs text-green-400 mt-1">Copied!</p>}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => window.close()} variant="outline" className="flex-1">Close</Button>
              <Button onClick={handleCallback} className="flex-1">Try Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}