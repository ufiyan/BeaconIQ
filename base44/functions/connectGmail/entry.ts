import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Refresh an access token using the stored refresh token; updates the settings record
async function refreshAccessToken(settings, base44, clientId, clientSecret) {
  console.log('[connectGmail] Refreshing access token...');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: settings.gmail_refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || 'unknown'}`);
  }
  const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  await base44.asServiceRole.entities.EmailIngestionSettings.update(settings.id, {
    gmail_access_token: data.access_token,
    gmail_token_expiry: newExpiry,
  });
  return data.access_token;
}

// Returns a valid access token, refreshing if expiring within 5 minutes
export async function getValidAccessToken(settings, base44, clientId, clientSecret) {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  if ((settings.gmail_token_expiry ?? 0) - Date.now() <= FIVE_MINUTES_MS) {
    console.log('[connectGmail] Token expiring soon — refreshing...');
    return await refreshAccessToken(settings, base44, clientId, clientSecret);
  }
  return settings.gmail_access_token;
}

async function logError(base44, functionName, message, context) {
  try {
    await base44.asServiceRole.entities.ErrorLog.create({
      function_name: functionName,
      error_message: message,
      timestamp: new Date().toISOString(),
      context: JSON.stringify(context || {}),
    });
  } catch (_) {
    // non-fatal — don't let error logging break the response
  }
}

Deno.serve(async (req) => {
  console.log('[connectGmail] Function called');

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[connectGmail] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return Response.json({ success: false, error: 'Server misconfiguration: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set. Contact your administrator.' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return Response.json({ success: false, error: 'Invalid request body — expected JSON' }, { status: 400 });
  }

  console.log('[connectGmail] Body received:', JSON.stringify({ ...body, code: body.code ? body.code.slice(0, 20) + '...' : null }));

  const { code, workspace_id, state, redirect_uri } = body;
  const finalWorkspaceId = workspace_id || state;

  if (!code) {
    return Response.json({
      success: false,
      error: 'No authorization code provided. This usually means the OAuth redirect URI is misconfigured, or the user cancelled the consent screen.',
    }, { status: 400 });
  }

  if (!finalWorkspaceId) {
    return Response.json({
      success: false,
      error: 'No workspace_id provided in state parameter — cannot store tokens safely.',
    }, { status: 400 });
  }

  // Require redirect_uri from the request — must match exactly what was used
  // to obtain the authorization code, otherwise Google will reject the exchange.
  if (!redirect_uri) {
    return Response.json({
      success: false,
      error: 'Missing redirect_uri in request body. The frontend must send the same redirect_uri that was used in the OAuth authorization step.',
    }, { status: 400 });
  }
  const effectiveRedirectUri = redirect_uri;
  console.log('[connectGmail] Using redirect_uri:', effectiveRedirectUri);

  const base44 = createClientFromRequest(req);

  // Authenticate the calling user
  let authUser;
  try {
    authUser = await base44.auth.me();
  } catch (_) {}
  if (!authUser) {
    return Response.json({ success: false, error: 'Unauthorized — please log in and try again.' }, { status: 401 });
  }
  const authenticatedEmail = authUser.email;

  // Exchange code for tokens
  console.log('[connectGmail] Exchanging code for tokens...');
  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    tokenData = await tokenRes.json();
    console.log('[connectGmail] Token response status:', tokenRes.status, '| keys:', Object.keys(tokenData));

    if (!tokenData.access_token) {
      const reason = tokenData.error_description || tokenData.error || 'unknown';
      const isRedirectMismatch = tokenData.error === 'redirect_uri_mismatch';
      const message = isRedirectMismatch
        ? `Redirect URI mismatch. The URI sent to Google (${effectiveRedirectUri}) must exactly match one registered in Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs.`
        : `Token exchange failed: ${reason}`;

      await logError(base44, 'connectGmail', message, { tokenError: tokenData, redirect_uri: effectiveRedirectUri, workspace_id: finalWorkspaceId });
      return Response.json({ success: false, error: message }, { status: 400 });
    }
  } catch (fetchErr) {
    const msg = `Network error during token exchange: ${fetchErr.message}`;
    await logError(base44, 'connectGmail', msg, { workspace_id: finalWorkspaceId });
    return Response.json({ success: false, error: msg }, { status: 500 });
  }

  // Get Gmail profile
  let gmailEmail = null;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    gmailEmail = userData.email || null;
    console.log('[connectGmail] Gmail email:', gmailEmail);
  } catch (_) {
    console.warn('[connectGmail] Could not fetch Gmail user profile (non-fatal)');
  }

  const tokenExpiry = Date.now() + (tokenData.expires_in ?? 3600) * 1000;

  // Store tokens on EmailIngestionSettings (scoped to workspace)
  try {
    console.log('[connectGmail] Looking up EmailIngestionSettings for workspace:', finalWorkspaceId);
    const settingsList = await base44.asServiceRole.entities.EmailIngestionSettings.filter(
      { workspace_id: finalWorkspaceId }, '-created_date', 1
    );

    if (settingsList.length) {
      const existing = settingsList[0];
      if (existing.created_by && existing.created_by !== authenticatedEmail) {
        console.error('[connectGmail] Ownership mismatch — refusing to update');
        return Response.json({ success: false, error: 'Forbidden: record does not belong to you' }, { status: 403 });
      }
      console.log('[connectGmail] Updating existing EmailIngestionSettings:', existing.id);
      await base44.asServiceRole.entities.EmailIngestionSettings.update(existing.id, {
        gmail_access_token: tokenData.access_token,
        gmail_refresh_token: tokenData.refresh_token ?? existing.gmail_refresh_token ?? null,
        gmail_token_expiry: tokenExpiry,
        gmail_email: gmailEmail,
        gmail_connected: true,
        created_by: authenticatedEmail,
      });
    } else {
      console.log('[connectGmail] No settings found — creating new EmailIngestionSettings record');
      await base44.asServiceRole.entities.EmailIngestionSettings.create({
        workspace_id: finalWorkspaceId,
        gmail_access_token: tokenData.access_token,
        gmail_refresh_token: tokenData.refresh_token ?? null,
        gmail_token_expiry: tokenExpiry,
        gmail_email: gmailEmail,
        gmail_connected: true,
        created_by: authenticatedEmail,
      });
    }
  } catch (dbErr) {
    const msg = `Failed to store Gmail tokens: ${dbErr.message}`;
    await logError(base44, 'connectGmail', msg, { workspace_id: finalWorkspaceId });
    return Response.json({ success: false, error: msg }, { status: 500 });
  }

  // Also mark workspace as connected for UI awareness
  try {
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: finalWorkspaceId }, '-created_date', 1);
    if (workspaces.length) {
      await base44.asServiceRole.entities.Workspace.update(workspaces[0].id, {
        gmail_connected: true,
        gmail_email: gmailEmail,
      });
    }
  } catch (wsErr) {
    console.warn('[connectGmail] Could not update Workspace record (non-fatal):', wsErr.message);
  }

  console.log('[connectGmail] Done — tokens stored on EmailIngestionSettings successfully');
  return Response.json({ success: true, gmail_email: gmailEmail });
});