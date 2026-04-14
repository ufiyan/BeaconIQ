import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) {
      return Response.json({ error: 'Missing code or redirect_uri' }, { status: 400 });
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[connectGmail] token exchange failed:', tokenData);
      return Response.json({ error: tokenData.error_description || 'Token exchange failed' }, { status: 400 });
    }

    // Fetch the Gmail address for this token
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileRes.json();
    const gmailEmail = profileData.email || null;

    // Compute expiry as Unix timestamp (seconds)
    const expiresIn = tokenData.expires_in ?? 3600;
    const gmailTokenExpiry = Math.floor(Date.now() / 1000) + expiresIn;

    // Find or resolve workspace for this user
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!workspaces.length) {
      return Response.json({ error: 'No workspace found for user' }, { status: 400 });
    }
    const workspace = workspaces[0];

    // Store tokens on the workspace record (user-scoped for RLS)
    await base44.entities.Workspace.update(workspace.id, {
      gmail_access_token: tokenData.access_token,
      gmail_refresh_token: tokenData.refresh_token || workspace.gmail_refresh_token || null,
      gmail_token_expiry: gmailTokenExpiry,
      gmail_email: gmailEmail,
      gmail_connected: true,
    });

    return Response.json({ success: true, gmail_email: gmailEmail });
  } catch (error) {
    console.error('[connectGmail] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});