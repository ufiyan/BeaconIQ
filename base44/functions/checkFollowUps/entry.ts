import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Semaphore-based concurrency limiter
async function withConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];
  for (const task of tasks) {
    const p = Promise.resolve().then(task);
    results.push(p);
    const e = p.then(() => executing.splice(executing.indexOf(e), 1));
    executing.push(e);
    if (executing.length >= limit) await Promise.race(executing);
  }
  return Promise.allSettled(results);
}

// --- Usage metering ---
async function incrementUsage(base44, workspaceId, delta) {
  const month = new Date().toISOString().slice(0, 7);
  const existing = await base44.asServiceRole.entities.WorkspaceUsage.filter(
    { workspace_id: workspaceId, month }, '-created_date', 1
  );
  if (existing.length) {
    const rec = existing[0];
    await base44.asServiceRole.entities.WorkspaceUsage.update(rec.id, {
      emails_sent:   (rec.emails_sent   || 0) + (delta.emails_sent   || 0),
      ai_calls_made: (rec.ai_calls_made || 0) + (delta.ai_calls_made || 0),
    });
  } else {
    await base44.asServiceRole.entities.WorkspaceUsage.create({
      workspace_id: workspaceId, month,
      emails_sent:   delta.emails_sent   || 0,
      ai_calls_made: delta.ai_calls_made || 0,
    });
  }
}

// Guard: throws if workspace_id is missing
function assertWorkspaceId(workspace_id) {
  if (!workspace_id) throw new Error('[checkFollowUps] workspace_id is required — cross-tenant leak prevented');
}

// Middleware guard: verifies the authenticated user owns the workspace (403 on mismatch)
async function validateTenant(base44, workspaceId, userId) {
  const workspaces = await base44.asServiceRole.entities.Workspace.filter({ id: workspaceId }, '-created_date', 1);
  if (!workspaces.length) throw Object.assign(new Error('Workspace not found'), { status: 403 });
  if (workspaces[0].owner_user_id !== userId) {
    throw Object.assign(new Error('[checkFollowUps] Tenant mismatch — access denied'), { status: 403 });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Resolve workspace and validate tenant ownership
    const workspaces = await base44.asServiceRole.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
    if (!workspaces.length) return Response.json({ error: 'No workspace found for user' }, { status: 400 });
    const workspaceId = workspaces[0].id;
    assertWorkspaceId(workspaceId);
    await validateTenant(base44, workspaceId, user.id);

    const profiles = await base44.asServiceRole.entities.BusinessProfile.filter({ created_by: user.email }, '-created_date', 1);
    const profile = profiles[0] || {};
    if (profile.followup_enabled === false) return Response.json({ message: 'Follow-up reminders disabled' });

    const noContactDays = profile.no_contact_days ?? 3;
    const noReplyDays = profile.no_reply_days ?? 5;
    const staleInterestedDays = profile.stale_interested_days ?? 7;
    const now = new Date();

    // Preload all workspace-scoped data in parallel — user-scoped client enforces RLS
    assertWorkspaceId(workspaceId);
    const [leadsResult, pendingResult, snoozedResult, emailLogsResult] = await Promise.allSettled([
      base44.entities.Lead.filter({ workspace_id: workspaceId }, '-created_date', 500),
      base44.entities.FollowUpReminder.filter({ workspace_id: workspaceId, status: 'pending' }),
      base44.entities.FollowUpReminder.filter({ workspace_id: workspaceId, status: 'snoozed' }),
      base44.entities.EmailLog.filter({ workspace_id: workspaceId }, '-created_date', 2000),
    ]);

    [leadsResult, pendingResult, snoozedResult, emailLogsResult].forEach((r, i) => {
      if (r.status === 'rejected') console.error(`[checkFollowUps] preload error [${i}]:`, r.reason);
    });

    const leads = leadsResult.status === 'fulfilled' ? leadsResult.value : [];
    const existingReminders = pendingResult.status === 'fulfilled' ? pendingResult.value : [];
    const snoozedReminders = snoozedResult.status === 'fulfilled' ? snoozedResult.value : [];
    const allEmailLogs = emailLogsResult.status === 'fulfilled' ? emailLogsResult.value : [];

    const activeLeads = leads.filter(l => ['New', 'Contacted', 'Interested'].includes(l.status));
    const existingLeadIds = new Set(existingReminders.map(r => r.lead_id));

    // Build map of lead_id -> most recent EmailLog
    const latestEmailByLead = {};
    for (const log of allEmailLogs) {
      if (!latestEmailByLead[log.lead_id]) latestEmailByLead[log.lead_id] = log;
    }

    // Reactivate snoozed reminders past their snooze_until
    const snoozedDue = snoozedReminders.filter(r => r.snooze_until && new Date(r.snooze_until) <= now);
    const snoozeResults = await withConcurrencyLimit(
      snoozedDue.map(r => () =>
        base44.entities.FollowUpReminder.update(r.id, { status: 'pending' })
      ),
      10
    );
    snoozeResults.filter(r => r.status === 'rejected').forEach(r =>
      console.error('[checkFollowUps] snooze reactivation error:', r.reason)
    );

    // Determine which leads need new reminders (pure computation)
    const toCreate = [];
    for (const lead of activeLeads) {
      if (existingLeadIds.has(lead.id)) continue;

      const lastEmail = latestEmailByLead[lead.id];
      const lastContactDate = lastEmail?.sent_at || lastEmail?.created_date || lead.last_contacted;
      const daysSinceCreated = (now - new Date(lead.created_date)) / (1000 * 60 * 60 * 24);

      let reminderType = null;
      let daysSince = 0;

      if (lead.status === 'New' && !lastEmail && daysSinceCreated >= noContactDays) {
        reminderType = 'no_contact';
        daysSince = Math.floor(daysSinceCreated);
      } else if (lead.status === 'Contacted' && lastContactDate) {
        const daysSinceContact = (now - new Date(lastContactDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceContact >= noReplyDays) {
          reminderType = 'no_reply';
          daysSince = Math.floor(daysSinceContact);
        }
      } else if (lead.status === 'Interested') {
        const refDate = lastContactDate || lead.updated_date || lead.created_date;
        const daysSinceActivity = (now - new Date(refDate)) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity >= staleInterestedDays) {
          reminderType = 'stale_interested';
          daysSince = Math.floor(daysSinceActivity);
        }
      }

      if (reminderType) toCreate.push({ lead, reminderType, daysSince });
    }

    // Create reminders with concurrency limit — user-scoped client enforces RLS
    assertWorkspaceId(workspaceId);
    const createResults = await withConcurrencyLimit(
      toCreate.map(({ lead, reminderType, daysSince }) => () =>
        base44.entities.FollowUpReminder.create({
          workspace_id: workspaceId,
          lead_id: lead.id,
          lead_name: lead.name,
          lead_company: lead.company || '',
          due_date: now.toISOString(),
          status: 'pending',
          reminder_type: reminderType,
          days_since_contact: daysSince,
          user_email: user.email,
        })
      ),
      10
    );

    const errors = createResults.filter(r => r.status === 'rejected');
    errors.forEach(r => console.error('[checkFollowUps] reminder creation error:', r.reason));
    const created = createResults.filter(r => r.status === 'fulfilled').length;

    // Meter usage: each reminder created counts as an emails_sent + an ai_calls_made
    if (created > 0) {
      try {
        await incrementUsage(base44, workspaceId, {
          emails_sent: created,
          ai_calls_made: created,
        });
      } catch (usageErr) {
        console.error('[checkFollowUps] usage metering error:', usageErr.message);
      }
    }

    return Response.json({ success: true, reminders_created: created, errors: errors.length });
  } catch (error) {
    const status = error.status === 403 ? 403 : 500;
    return Response.json({ error: error.message }, { status });
  }
});