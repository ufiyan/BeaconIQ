import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReactQuill from "react-quill";

const DEFAULT = { name: "", subject: "", body: "", intent_range_min: 0, intent_range_max: 100 };

export default function TemplateModal({ open, onClose, template, onSave }) {
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(template ? {
      name: template.name || "",
      subject: template.subject || "",
      body: template.body || "",
      intent_range_min: template.intent_range_min ?? 0,
      intent_range_max: template.intent_range_max ?? 100,
    } : DEFAULT);
  }, [template, open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <DialogHeader>
          <DialogTitle className="text-white">{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#94A3B8" }}>Template Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. High Intent Follow-Up" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#94A3B8" }}>Email Subject *</Label>
            <Input value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Following up on your inquiry" />
          </div>

          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#94A3B8" }}>Email Body *</Label>
            <div className="rounded-md overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
              <ReactQuill
                theme="snow"
                value={form.body}
                onChange={val => set("body", val)}
                style={{ background: "hsl(var(--background))", color: "#fff", minHeight: 180 }}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1.5 block" style={{ color: "#94A3B8" }}>
              Intent Score Range — use this template for leads with intent score between:
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="number" min={0} max={100}
                  value={form.intent_range_min}
                  onChange={e => set("intent_range_min", Number(e.target.value))}
                  placeholder="Min (0)"
                />
              </div>
              <span style={{ color: "#94A3B8" }}>—</span>
              <div className="flex-1">
                <Input
                  type="number" min={0} max={100}
                  value={form.intent_range_max}
                  onChange={e => set("intent_range_max", Number(e.target.value))}
                  placeholder="Max (100)"
                />
              </div>
              <span className="text-xs" style={{ color: "#94A3B8" }}>/ 100</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} style={{ color: "#94A3B8" }}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.name || !form.subject || !form.body}
            style={{ background: "#F59E0B", color: "#000", border: "none" }}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}