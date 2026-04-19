import { useState } from "react";
import { base44 } from "@/api/base44Client";
// base44.entities.Workspace used inline
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function AddLeadDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", title: "", phone: "", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setSaving(true);
    const user = await base44.auth.me();
    const workspaces = await base44.entities.Workspace.filter({ owner_user_id: user.id }, '-created_date', 1).catch(() => []);
    const workspaceId = workspaces[0]?.id;
    await base44.entities.Lead.create({ ...form, workspace_id: workspaceId, source: "Manual Entry", status: "New" });
    toast({ title: "Lead added successfully" });
    setForm({ name: "", email: "", company: "", title: "", phone: "", priority: "Medium" });
    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Lead"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}