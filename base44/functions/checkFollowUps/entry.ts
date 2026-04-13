import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profiles = await base44.asServiceRole.entities.BusinessProfile.filter({ created_by: user.email }, '-created_date', 1);
    const profile = profiles[0] || {};
    if (profile.followup_enabled === false) return Response.json({ message: 'Follow-up reminders disabled' });

    const noContactDays = profile.no_contact_days ?? 3;
    const noReplyDays = profile.no_reply_days ?? 5;
    const staleInterestedDays = profile.stale_interested_days ?? 7;
    const now = new Date();

    // Preload all data in parallel
    const [leads, existingReminders, snoozedReminders, allEmailLogs] = await Promise.all([
      base44.asServiceRole.entities.Lead.filter({ created_by: user.email }, '-created_date', 500),
      base44.asServiceRole.entities.FollowUpReminder.filter({ user_email: user.email, status: 'pending' }),
      base44.asServiceRole.entities.FollowUpReminder.filter({ user_email: user.email, status: 'snoozed' }),
      base44.asServiceRole.entities.EmailLog.filter({ created_by: user.email }, '-created_date', 2000),
    ]);

    const activeLeads = leads.filter(l => ['New', 'Contacted', 'Interested'].includes(l.status));
    const existingLeadIds = new Set(existingReminders.map(r => r.lead_id));

    // Build map of lead_id -> most recent EmailLog (already sorted by -created_date)
    const latestEmailByLead = {};
    for (const log of allEmailLogs) {
      if (!latestEmailByLead[log.lead_id]) latestEmailByLead[log.lead_id] = log;
    }

    // Reactivate snoozed reminders in parallel
    const snoozedDue = snoozedReminders.filter(r => r.snooze_until && new Date(r.snooze_until) <= now);
    await Promise.all(snoozedDue.map(r =>
      base44.asServiceRole.entities.FollowUpReminder.update(r.id, { status: 'pending' })
    ));

    // Determine which leads need reminders (pure computation, no I/O)
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

      if (reminderType) {
        toCreate.push({ lead, reminderType, daysSince });
      }
    }

    // Create reminders in parallel batches of 10
    let created = 0;
    for (const chunk of chunkArray(toCreate, 10)) {
      await Promise.all(chunk.map(({ lead, reminderType, daysSince }) =>
        base44.asServiceRole.entities.FollowUpReminder.create({
          lead_id: lead.id,
          lead_name: lead.name,
          lead_company: lead.company || '',
          due_date: now.toISOString(),
          status: 'pending',
          reminder_type: reminderType,
          days_since_contact: daysSince,
          user_email: user.email,
        })
      ));
      created += chunk.length;
    }

    return Response.json({ success: true, reminders_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});