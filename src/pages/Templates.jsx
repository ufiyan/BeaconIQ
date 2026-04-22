import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import TemplateModal from "@/components/TemplateModal";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import { SkeletonTable } from "@/components/SkeletonTable";

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

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <PageHeader title="Email Templates" description="Loading…" />
        <SkeletonTable rows={4} cols={3} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Email Templates"
        description="Templates are matched to leads by intent score and used as a base for AI-personalized emails."
      >
        <Button onClick={openNew} className="gap-1.5 h-9 text-[13px]">
          <Plus className="h-3.5 w-3.5" /> New Template
        </Button>
      </PageHeader>

      {templates.length === 0 ? (
        <div className="surface rounded-xl">
          <EmptyState icon={FileText} title="No templates yet" description="Create templates to speed up personalized outreach based on lead intent scores.">
            <Button onClick={openNew} className="h-9 text-[13px] gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Template
            </Button>
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="surface rounded-xl p-4 flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 border border-primary/20">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[14px] font-semibold text-white">{t.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-warning/10 text-warning border border-warning/20">
                    Intent {t.intent_range_min ?? 0}–{t.intent_range_max ?? 100}
                  </span>
                  {t.use_count > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent/10 text-accent border border-accent/20">
                      Used {t.use_count}×
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-muted-foreground truncate">Subject: {t.subject}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal open={modalOpen} onClose={() => setModalOpen(false)} template={editing} onSave={handleSave} />
    </div>
  );
}