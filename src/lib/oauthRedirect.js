/**
 * Canonical OAuth redirect URI helper.
 * We always use the current origin + /oauth/callback.
 * This ensures the redirect URI is consistent between the auth request and token exchange.
 */
export function getOAuthRedirectUri() {
  return `${window.location.origin}/oauth/callback`;
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function buildGmailOAuthUrl(workspaceId) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const redirectUri = getOAuthRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: workspaceId || "onboarding",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}