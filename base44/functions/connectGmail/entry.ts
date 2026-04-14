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

    // Find workspace — try owner_user_id first, then created_by, then auto-create
    console.log('[connectGmail] Step 5 - Looking up workspace | user.id:', user.id, '| user.email:', user.email);

    let workspace = null;

    // Strategy 1: owner_user_id
    const byOwnerId = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    console.log('[connectGmail] Step 6a - By owner_user_id:', byOwnerId.length);
    if (byOwnerId.length) {
      workspace = byOwnerId[0];
    }

    // Strategy 2: created_by email
    if (!workspace) {
      const byEmail = await base44.asServiceRole.entities.Workspace.filter({ created_by: user.email }, '-created_date', 1);
      console.log('[connectGmail] Step 6b - By created_by email:', byEmail.length);
      if (byEmail.length) workspace = byEmail[0];
    }

    // Strategy 3: auto-create workspace
    if (!workspace) {
      console.log('[connectGmail] Step 6c - No workspace found, auto-creating...');
      workspace = await base44.asServiceRole.entities.Workspace.create({
        owner_user_id: user.id,
        name: user.full_name ? `${user.full_name}'s Workspace` : 'My Workspace',
      });
      console.log('[connectGmail] Step 6c - Workspace created:', workspace.id);
    }

    const tokenExpiry = Date.now() + 3600000;

    console.log('[connectGmail] Step 7 - Updating workspace:', workspace.id, '| gmail_email:', gmailEmail, '| token_expiry:', tokenExpiry);
    await base44.asServiceRole.entities.Workspace.update(workspace.id, {
      gmail_access_token: tokenData.access_token,
      gmail_refresh_token: tokenData.refresh_token || workspace.gmail_refresh_token,
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