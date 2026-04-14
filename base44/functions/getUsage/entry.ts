import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { workspace_id, month } = await req.json();

    // Resolve workspace — try owner_user_id first, fall back to created_by (email)
    console.log('[getUsage] user:', JSON.stringify({ id: user.id, email: user.email }));
    let ownedWorkspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!ownedWorkspaces.length) {
      ownedWorkspaces = await base44.asServiceRole.entities.Workspace.filter({ created_by: user.email }, '-created_date', 1);
    }
    console.log('[getUsage] workspaces found:', ownedWorkspaces.length);
    if (!ownedWorkspaces.length) return Response.json({ error: 'No workspace found' }, { status: 400 });
    const wsId = ownedWorkspaces[0].id;

    const targetMonth = month || new Date().toISOString().slice(0, 7); // "YYYY-MM"

    const records = await base44.asServiceRole.entities.WorkspaceUsage.filter(
      { workspace_id: wsId, month: targetMonth }, '-created_date', 1
    );

    if (!records.length) {
      return Response.json({
        workspace_id: wsId,
        month: targetMonth,
        emails_processed: 0,
        leads_created: 0,
        emails_sent: 0,
        ai_calls_made: 0,
      });
    }

    return Response.json(records[0]);
  } catch (error) {
    try {
      const base44Err = createClientFromRequest(req);
      await base44Err.asServiceRole.entities.ErrorLog.create({
        workspace_id: 'unknown',
        function_name: 'getUsage',
        error_message: error.message || String(error),
        error_stack: error.stack?.slice(0, 1000) || '',
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});