import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  console.log('[connectGmail] Function called');

  try {
    const body = await req.json();
    console.log('[connectGmail] Body received:', JSON.stringify({ ...body, code: body.code ? body.code.slice(0, 20) + '...' : null }));

    const { code, workspace_id, state } = body;
    const finalWorkspaceId = workspace_id || state;

    if (!code) {
      return Response.json({ success: false, error: 'No authorization code provided' }, { status: 400 });
    }

    // Exchange code for tokens
    console.log('[connectGmail] Exchanging code for tokens...');
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        redirect_uri: 'https://app.base44.com/oauth/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('[connectGmail] Token response status:', tokenRes.status);
    console.log('[connectGmail] Token data keys:', Object.keys(tokenData));

    if (!tokenData.access_token) {
      return Response.json({ success: false, error: 'Token exchange failed', details: tokenData }, { status: 400 });
    }

    // Get Gmail email
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();
    console.log('[connectGmail] Gmail email:', userData.email);

    // Update workspace
    const base44 = createClientFromRequest(req);

    let workspaces = [];
    if (finalWorkspaceId) {
      workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: finalWorkspaceId });
    }
    if (!workspaces.length) {
      // Try by authenticated user
      const user = await base44.auth.me();
      console.log('[connectGmail] Auth user:', user?.id, user?.email);
      if (user) {
        workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
        if (!workspaces.length) {
          workspaces = await base44.asServiceRole.entities.Workspace.filter({ created_by: user.email }, '-created_date', 1);
        }
        // Auto-create if still not found
        if (!workspaces.length) {
          console.log('[connectGmail] No workspace found, auto-creating...');
          const newWs = await base44.asServiceRole.entities.Workspace.create({
            owner_user_id: user.id,
            name: user.full_name ? `${user.full_name}'s Workspace` : 'My Workspace',
          });
          workspaces = [newWs];
        }
      }
    }

    console.log('[connectGmail] Workspaces found:', workspaces.length);

    if (!workspaces.length) {
      return Response.json({ success: false, error: 'No workspace found' }, { status: 404 });
    }

    const workspace = workspaces[0];
    await base44.asServiceRole.entities.Workspace.update(workspace.id, {
      gmail_access_token: tokenData.access_token,
      gmail_refresh_token: tokenData.refresh_token ?? null,
      gmail_token_expiry: Date.now() + (tokenData.expires_in ?? 3600) * 1000,
      gmail_email: userData.email,
      gmail_connected: true,
    });

    console.log('[connectGmail] Workspace updated successfully!');
    return Response.json({ success: true, gmail_email: userData.email });

  } catch (err) {
    console.error('[connectGmail] Error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});