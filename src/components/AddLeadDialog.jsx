import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const EMPTY_FORM = { name: "", email: "", company: "", title: "", phone: "", priority: "Medium" };

export default function AddLeadDialog({ open, onClose, onSuccess }) {
  const { workspace } = useWorkspace();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim() || !form.email.trim()) return;
    if (!workspace?.id) {
      toast({ title: "Workspace not ready", description: "Please refresh and try again.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const email = form.email.trim().toLowerCase();
      // Duplicate guard (scoped to workspace)
      const existing = await base44.entities.Lead
        .filter({ workspace_id: workspace.id, email }, "-created_date", 1)
        .catch(() => []);
      if (existing.length > 0) {
        toast({ title: "Lead already exists", description: `${email} is already in this workspace.`, variant: "destructive" });
        setSaving(false);
        return;
      }
      await base44.entities.Lead.create({
        ...form,
        name: form.name.trim(),
        email,
        workspace_id: workspace.id,
        source: "Manual Entry",
        status: "New",
      });
      toast({ title: "Lead added", description: `${form.name.trim()} added to your workspace.` });
      setForm(EMPTY_FORM);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({ title: "Could not add lead", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="John Doe" required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="john@company.com" required />
            </div>
            <div>
              <Label>Company</Label>
              <Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Acme Inc" />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="CEO" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 234 567 890" />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !workspace?.id}>{saving ? "Saving..." : "Add Lead"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}