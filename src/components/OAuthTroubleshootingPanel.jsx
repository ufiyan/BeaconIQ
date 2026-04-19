import { useState } from "react";
import { Copy, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { getOAuthRedirectUri } from "@/lib/oauthRedirect";

export default function OAuthTroubleshootingPanel({ gmailStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const redirectUri = getOAuthRedirectUri();
  const baseUrl = window.location.origin;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasClientId = !!clientId;

  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyRow = ({ label, value, field }) => (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(59,130,246,0.2)" }}>
        <code className="text-xs text-blue-300 flex-1 break-all">{value}</code>
        <button onClick={() => copy(value, field)} className="flex-shrink-0 text-muted-foreground hover:text-white transition-colors">
          {copiedField === field ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );

  const StatusRow = ({ label, ok, detail }) => (
    <div className="flex items-start gap-2 mb-2">
      {ok ? (
        <CheckCircle className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
      )}
      <div>
        <span className="text-xs text-white">{label}</span>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border" style={{ background: "hsl(var(--card))" }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-medium text-white">OAuth Troubleshooting</p>
          <p className="text-xs text-muted-foreground">Redirect URIs, credential status, and connection diagnostics</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-5">

          {/* Credential status */}
          <div>
            <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">Credential Status</p>
            <StatusRow
              label="GOOGLE_CLIENT_ID"
              ok={hasClientId}
              detail={hasClientId ? `Set (${clientId.slice(0, 20)}...)` : "Missing — set VITE_GOOGLE_CLIENT_ID in environment variables"}
            />
            <StatusRow
              label="GOOGLE_CLIENT_SECRET"
              ok={true}
              detail="Stored as server-side secret (cannot be verified client-side)"
            />
            <StatusRow
              label="Gmail connection"
              ok={gmailStatus?.connected}
              detail={gmailStatus?.connected ? `Connected as ${gmailStatus.email}` : "Not connected"}
            />
          </div>

          {/* Required URIs */}
          <div>
            <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wide">Google Cloud Console Setup</p>
            <p className="text-xs text-muted-foreground mb-3">
              In <strong className="text-white">Google Cloud Console → Credentials → OAuth 2.0 Client ID</strong>, add these exactly:
            </p>
            <CopyRow label="Authorized JavaScript Origins" value={baseUrl} field="origin" />
            <CopyRow label="Authorized Redirect URI" value={redirectUri} field="redirect" />
          </div>

          {/* Unverified app guidance */}
          <div className="rounded-lg p-4" style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <p className="text-xs font-semibold text-amber-400 mb-2">⚠ "Google hasn't verified this app" warning</p>
            <p className="text-xs text-muted-foreground mb-2">
              This appears when the consent screen is in <strong className="text-white">Testing</strong> mode. To fix it:
            </p>
            <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
              <li>Go to <strong className="text-white">OAuth consent screen → Test users</strong></li>
              <li>Add the Gmail address you want to connect as a test user</li>
              <li>Test users can proceed past the unverified warning</li>
              <li>Submit for Google verification when ready for production use</li>
            </ol>
          </div>

        </div>
      )}
    </div>
  );
}