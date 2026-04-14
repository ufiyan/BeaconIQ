import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import TemplateModal from "@/components/TemplateModal";
import EmptyState from "@/components/EmptyState";

export default function Templates() {
  const { workspace } = useWorkspace();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    if (!workspace?.id) return;
    setLoading(true);
    const data = await base44.entities.Template.filter({ workspace_id: workspace.id }, "-created_date", 100);
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [workspace?.id]);

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.Template.update(editing.id, form);
    } else {
      await base44.entities.Template.create({ ...form, workspace_id: workspace.id, use_count: 0 });
    }
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    await base44.entities.Template.delete(id);
    setTemplates(t => t.filter(x => x.id !== id));
  };

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Email Templates</h1>
          <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
            Templates are matched to leads by intent score and used as a base for AI-personalized emails.
          </p>
        </div>
        <Button onClick={openNew} className="text-xs h-8 gap-1.5" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
          <Plus className="h-3.5 w-3.5" /> New Template
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState icon={FileText} title="No templates yet" description="Create templates to speed up personalized outreach based on lead intent scores.">
          <Button onClick={openNew} className="text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Template
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="rounded-xl p-4 flex items-start gap-4"
              style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(59,130,246,0.12)" }}>
                <FileText className="h-4 w-4" style={{ color: "#3B82F6" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                    IQ {t.intent_range_min ?? 0}–{t.intent_range_max ?? 100}
                  </span>
                  {t.use_count > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#818CF8" }}>
                      Used {t.use_count}×
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: "#94A3B8" }}>
                  Subject: {t.subject}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}
                  style={{ color: "#94A3B8" }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(t.id)}
                  style={{ color: "#94A3B8" }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        template={editing}
        onSave={handleSave}
      />
    </div>
  );
}