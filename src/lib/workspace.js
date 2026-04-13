import { base44 } from '@/api/base44Client';

/**
 * Derives a stable workspace_id from the authenticated user's Base44 user ID.
 * One user = one workspace. Returns the workspace record (creating it if needed).
 */
export async function getOrCreateWorkspace(user) {
  if (!user?.id) throw new Error('[workspace] Cannot resolve workspace: user.id is missing');

  const existing = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1);
  if (existing.length > 0) return existing[0];

  // Create workspace on first login
  const workspace = await base44.entities.Workspace.create({
    owner_user_id: user.id,
    name: user.full_name ? `${user.full_name}'s Workspace` : 'My Workspace',
    gmail_connected: false,
  });
  return workspace;
}

/**
 * Guard: throws if workspace_id is undefined/null/empty.
 * Call at the top of every data-fetching function that is tenant-scoped.
 */
export function assertWorkspaceId(workspace_id) {
  if (!workspace_id) {
    throw new Error('[workspace] workspace_id is required but was not provided. Possible cross-tenant data leak prevented.');
  }
}