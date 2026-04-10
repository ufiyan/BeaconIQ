import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load follow-up settings from BusinessProfile
    const profiles = await base44.asServiceRole.entities.BusinessProfile.list('-created_date', 1);
    const profile = profiles[0] || {};
    const enabled = profile.followup_enabled !== false;
    if (!enabled) return Response.json({ message: 'Follow-up reminders disabled' });

    const noContactDays = profile.no_contact_days ?? 3;
    const noReplyDays = profile.no_reply_days ?? 5;
    const staleInterestedDays = profile.stale_interested_days ?? 7;
    const now = new Date();

    // Fetch active leads
    const leads = await base44.asServiceRole.entities.Lead.list('-created_date', 500);
    const activLeads = leads.filter(l => ['New', 'Contacted', 'Interested'].includes(l.status));

    // Get existing pending reminders to avoid duplicates
    const existingReminders = await base44.asServiceRole.entities.FollowUpReminder.filter({ status: 'pending' });
    const snoozedReminders = await base44.asServiceRole.entities.FollowUpReminder.filter({ status: 'snoozed' });

    const existingLeadIds = new Set(existingReminders.map(r => r.lead_id));

    // Re-activate snoozed reminders past their snooze_until
    for (const r of snoozedReminders) {
      if (r.snooze_until && new Date(r.snooze_until) <= now) {
        await base44.asServiceRole.entities.FollowUpReminder.update(r.id, { status: 'pending' });
      }
    }

    let created = 0;
    for (const lead of activLeads) {
      if (existingLeadIds.has(lead.id)) continue;

      // Find last email sent to this lead
      const emails = await base44.asServiceRole.entities.EmailLog.filter({ lead_id: lead.id }, '-created_date', 1);
      const lastEmail = emails[0];
      const lastContactDate = lastEmail?.sent_at || lastEmail?.created_date || lead.last_contacted;
      const leadCreatedDate = new Date(lead.created_date);
      const daysSinceCreated = (now - leadCreatedDate) / (1000 * 60 * 60 * 24);

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
        await base44.asServiceRole.entities.FollowUpReminder.create({
          lead_id: lead.id,
          lead_name: lead.name,
          lead_company: lead.company || '',
          due_date: now.toISOString(),
          status: 'pending',
          reminder_type: reminderType,
          days_since_contact: daysSince,
        });
        created++;
      }
    }

    return Response.json({ success: true, reminders_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});