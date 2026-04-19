import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve workspace
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!workspaces.length) return Response.json({ connected: false, email: null });
    const workspaceId = workspaces[0].id;

    // Check EmailIngestionSettings for token-based Gmail connection
    const settingsList = await base44.asServiceRole.entities.EmailIngestionSettings.filter(
      { workspace_id: workspaceId }, '-created_date', 1
    );

    if (!settingsList.length || !settingsList[0].gmail_connected) {
      return Response.json({ connected: false, email: null });
    }

    const settings = settingsList[0];

    // Verify token is still valid by calling Gmail API
    const accessToken = settings.gmail_access_token;
    if (!accessToken) return Response.json({ connected: false, email: settings.gmail_email || null });

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      return Response.json({ connected: false, email: settings.gmail_email || null });
    }

    const profile = await res.json();
    return Response.json({ connected: true, email: profile.emailAddress || settings.gmail_email });
  } catch (_) {
    return Response.json({ connected: false, email: null });
  }
});