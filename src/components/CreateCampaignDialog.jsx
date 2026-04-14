import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function CreateCampaignDialog({ open, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState([
    { day: 0, subject_template: "", message_template: "" },
    { day: 2, subject_template: "", message_template: "" },
    { day: 5, subject_template: "", message_template: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    setSteps([...steps, { day: lastDay + 3, subject_template: "", message_template: "" }]);
  };

  const removeStep = (i) => setSteps(steps.filter((_, idx) => idx !== i));

  const updateStep = (i, field, value) => {
    const updated = [...steps];
    updated[i] = { ...updated[i], [field]: value };
    setSteps(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    const user2 = await base44.auth.me();
    const workspaces2 = await base44.entities.Workspace.filter({ owner_user_id: user2.id }, '-created_date', 1).catch(() => []);
    const workspaceId = workspaces2[0]?.id;
    await base44.entities.Campaign.create({
      workspace_id: workspaceId,
      name,
      description,
      steps,
      status: "Draft"
    });
    toast({ title: "Campaign created" });
    setSaving(false);
    setName("");
    setDescription("");
    setSteps([
      { day: 0, subject_template: "", message_template: "" },
      { day: 2, subject_template: "", message_template: "" },
      { day: 5, subject_template: "", message_template: "" },
    ]);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Campaign Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Q2 Outreach" required />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Follow-up sequence for new leads" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="mb-0">Follow-up Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep} className="gap-1">
                <Plus className="h-3 w-3" /> Add Step
              </Button>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                    {steps.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(i)} className="h-6 w-6 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20">
                      <Label className="text-xs">Day</Label>
                      <Input type="number" min="0" value={step.day} onChange={e => updateStep(i, "day", parseInt(e.target.value) || 0)} />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Subject</Label>
                      <Input value={step.subject_template} onChange={e => updateStep(i, "subject_template", e.target.value)} placeholder="Email subject..." />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Message Template</Label>
                    <Textarea 
                      value={step.message_template} 
                      onChange={e => updateStep(i, "message_template", e.target.value)} 
                      placeholder="Hi {name}, ..." 
                      rows={2} 
                      className="resize-none text-sm" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Campaign"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}