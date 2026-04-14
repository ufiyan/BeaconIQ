import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { code, redirect_uri } = body;
    console.log('[connectGmail] Step 1 - Received payload:', { code: code ? code.slice(0, 20) + '...' : null, redirect_uri });
    if (!code) return Response.json({ success: false, error: 'Missing authorization code' }, { status: 400 });

    // Exchange code for tokens
    const tokenParams = {
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ? '[SET]' : '[MISSING]',
      redirect_uri: redirect_uri || 'https://app.base44.com/oauth/callback',
      grant_type: 'authorization_code',
    };
    console.log('[connectGmail] Step 2 - Token exchange params (secret masked):', tokenParams);

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
    console.log('[connectGmail] Step 3 - Token exchange response status:', tokenRes.status, '| has access_token:', !!tokenData.access_token, '| has refresh_token:', !!tokenData.refresh_token, '| error:', tokenData.error || null);
    if (!tokenRes.ok || !tokenData.access_token) {
      return Response.json({ success: false, error: tokenData.error_description || tokenData.error || 'Token exchange failed' }, { status: 400 });
    }

    // Fetch Gmail address
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = await userInfoRes.json();
    const gmailEmail = userInfo.email;
    console.log('[connectGmail] Step 4 - Userinfo fetch status:', userInfoRes.status, '| email:', gmailEmail, '| error:', userInfo.error || null);

    // Find workspace and update
    console.log('[connectGmail] Step 5 - Looking up workspace for user.id:', user.id);
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    console.log('[connectGmail] Step 6 - Workspaces found:', workspaces.length, workspaces[0] ? '| workspace id: ' + workspaces[0].id : '');
    if (!workspaces.length) return Response.json({ success: false, error: 'No workspace found' }, { status: 404 });

    const tokenExpiry = Math.floor(Date.now() / 1000) + (tokenData.expires_in ?? 3600);

    console.log('[connectGmail] Step 7 - Updating workspace:', workspaces[0].id, '| gmail_email:', gmailEmail, '| token_expiry:', tokenExpiry);
    await base44.asServiceRole.entities.Workspace.update(workspaces[0].id, {
      gmail_access_token: tokenData.access_token,
      gmail_refresh_token: tokenData.refresh_token || workspaces[0].gmail_refresh_token,
      gmail_token_expiry: tokenExpiry,
      gmail_email: gmailEmail,
      gmail_connected: true,
    });
    console.log('[connectGmail] Step 8 - Workspace updated successfully');

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