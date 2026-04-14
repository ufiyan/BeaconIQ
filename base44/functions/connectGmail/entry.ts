import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { code, redirect_uri } = await req.json();
    if (!code) return Response.json({ success: false, error: 'Missing authorization code' }, { status: 400 });

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
        redirect_uri: redirect_uri || 'https://app.base44.com/oauth/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.json({ success: false, error: tokenData.error_description || tokenData.error || 'Token exchange failed' }, { status: 400 });
    }

    // Fetch Gmail address
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const gmailEmail = userInfo.email;

    // Find workspace and update
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!workspaces.length) return Response.json({ success: false, error: 'No workspace found' }, { status: 404 });

    const tokenExpiry = Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600);

    await base44.asServiceRole.entities.Workspace.update(workspaces[0].id, {
      gmail_access_token: tokenData.access_token,
      gmail_refresh_token: tokenData.refresh_token || workspaces[0].gmail_refresh_token,
      gmail_token_expiry: tokenExpiry,
      gmail_email: gmailEmail,
      gmail_connected: true,
    });

    return Response.json({ success: true, gmail_email: gmailEmail });
  } catch (error) {
    // Log error (best-effort)
    try {
      const base44Err = createClientFromRequest(req);
      await base44Err.asServiceRole.entities.ErrorLog.create({
        workspace_id: 'unknown',
        function_name: 'connectGmail',
        error_message: error.message || String(error),
        error_stack: error.stack?.slice(0, 1000) || '',
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});