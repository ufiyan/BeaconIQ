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

Deno.serve(async (req) => {
  console.log('[connectGmail] Function called');

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ success: false, error: 'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' }, { status: 500 });
    }

    const body = await req.json();
    console.log('[connectGmail] Body received:', JSON.stringify({ ...body, code: body.code ? body.code.slice(0, 20) + '...' : null }));

    const { code, workspace_id, state } = body;
    const finalWorkspaceId = workspace_id || state;

    if (!code) {
      return Response.json({ success: false, error: 'No authorization code provided' }, { status: 400 });
    }
    if (!finalWorkspaceId) {
      return Response.json({ success: false, error: 'No workspace_id provided — cannot store tokens safely' }, { status: 400 });
    }

    // Exchange code for tokens
    console.log('[connectGmail] Exchanging code for tokens...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://app.base44.com/oauth/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('[connectGmail] Token response status:', tokenRes.status, '| keys:', Object.keys(tokenData));

    if (!tokenData.access_token) {
      return Response.json({ success: false, error: 'Token exchange failed', details: tokenData }, { status: 400 });
    }

    // Get Gmail email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    console.log('[connectGmail] Gmail email:', userData.email);

    const base44 = createClientFromRequest(req);
    const tokenExpiry = Date.now() + (tokenData.expires_in ?? 3600) * 1000;

    // Store tokens on EmailIngestionSettings (scoped to workspace)
    console.log('[connectGmail] Looking up EmailIngestionSettings for workspace:', finalWorkspaceId);
    const settingsList = await base44.asServiceRole.entities.EmailIngestionSettings.filter(
      { workspace_id: finalWorkspaceId }, '-created_date', 1
    );

    if (settingsList.length) {
      console.log('[connectGmail] Updating existing EmailIngestionSettings:', settingsList[0].id);
      await base44.asServiceRole.entities.EmailIngestionSettings.update(settingsList[0].id, {
        gmail_access_token: tokenData.access_token,
        gmail_refresh_token: tokenData.refresh_token ?? settingsList[0].gmail_refresh_token ?? null,
        gmail_token_expiry: tokenExpiry,
        gmail_email: userData.email,
        gmail_connected: true,
      });
    } else {
      console.log('[connectGmail] No settings found — creating new EmailIngestionSettings record');
      await base44.asServiceRole.entities.EmailIngestionSettings.create({
        workspace_id: finalWorkspaceId,
        gmail_access_token: tokenData.access_token,
        gmail_refresh_token: tokenData.refresh_token ?? null,
        gmail_token_expiry: tokenExpiry,
        gmail_email: userData.email,
        gmail_connected: true,
      });
    }

    // Also mark workspace as connected for UI awareness
    try {
      const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: finalWorkspaceId }, '-created_date', 1);
      if (workspaces.length) {
        await base44.asServiceRole.entities.Workspace.update(workspaces[0].id, {
          gmail_connected: true,
          gmail_email: userData.email,
        });
      }
    } catch (wsErr) {
      console.warn('[connectGmail] Could not update Workspace record (non-fatal):', wsErr.message);
    }

    console.log('[connectGmail] Done — tokens stored on EmailIngestionSettings successfully');
    return Response.json({ success: true, gmail_email: userData.email });

  } catch (err) {
    console.error('[connectGmail] Error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});