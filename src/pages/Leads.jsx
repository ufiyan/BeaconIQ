import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import IntentScoreBadge from "../components/IntentScoreBadge";
import { Link } from "react-router-dom";
import { Users, Plus, Upload, Search, Clock, LayoutList, Columns, X, Mail, Briefcase, Building, ArrowRight } from "lucide-react";
import KanbanBoard from "../components/KanbanBoard";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { SkeletonTable } from "../components/SkeletonTable";
import AddLeadDialog from "../components/AddLeadDialog";
import ImportLeadsDialog from "../components/ImportLeadsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import moment from "moment";

const SOURCE_STYLES = {
  "CSV Upload":       { bg: "rgba(139,92,246,0.12)",  color: "#A78BFA" },
  "Email Ingestion":  { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA" },
  "Manual Entry":     { bg: "rgba(148,163,184,0.12)", color: "#94A3B8" },
  "Referral":         { bg: "rgba(16,185,129,0.12)",  color: "#34D399" },
  "Website":          { bg: "rgba(245,158,11,0.12)",  color: "#FBBF24" },
  "Gmail Ingestion":  { bg: "rgba(59,130,246,0.12)",  color: "#60A5FA" },
};

function initials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function Leads() {
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const { toast } = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState("intent");
  const [intentScores, setIntentScores] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [reminderLeadIds, setReminderLeadIds] = useState(new Set());
  const [selectedLead, setSelectedLead] = useState(null);

  const loadLeads = async () => {
    if (!workspace) return;
    const wf = { workspace_id: workspace.id };
    try {
      const [data, scores, reminders] = await Promise.all([
        base44.entities.Lead.filter(wf, "-created_date", 200),
        base44.entities.IntentScore.filter(wf, "-scored_at", 500),
        base44.entities.FollowUpReminder.filter({ workspace_id: workspace.id, status: "pending" }, "-created_date", 500).catch(() => []),
      ]);
      setLeads(data);
      const scoreMap = {};
      for (const s of scores) { scoreMap[s.lead_id] = s.intent_score; }
      setIntentScores(scoreMap);
      setReminderLeadIds(new Set(reminders.map(r => r.lead_id)));
    } catch (err) {
      toast({ title: "Failed to load leads", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLeadStatusUpdate = (leadId, newStatus) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  useEffect(() => { if (!workspaceLoading) loadLeads(); }, [workspace, workspaceLoading]);

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (sortMode === "intent") {
      return (intentScores[b.id] ?? -1) - (intentScores[a.id] ?? -1);
    }
    return new Date(b.created_date) - new Date(a.created_date);
  });

  if (workspaceLoading || loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <PageHeader title="Leads" description="Loading your lead pipeline…" />
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  const lastActivity = (lead) => {
    const d = lead.last_contacted || lead.created_date;
    return d ? moment(d).fromNow() : "—";
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Leads" description={`${leads.length} total · ${filtered.length} visible`}>
        <div className="flex items-center rounded-lg overflow-hidden border border-border bg-card">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium transition-colors ${viewMode === 'list' ? 'bg-secondary text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            <LayoutList className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium transition-colors ${viewMode === 'kanban' ? 'bg-secondary text-white' : 'text-muted-foreground hover:text-white'}`}
          >
            <Columns className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
        <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 h-8 text-[12px]">
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
        <Button onClick={() => setShowAdd(true)} className="gap-1.5 h-8 text-[12px]">
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </Button>
      </PageHeader>

      {viewMode === 'list' && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search by name, email, or company…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-[13px] bg-card" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-[13px] bg-card">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["New","Contacted","Replied","Interested","Meeting Booked","Closed","Unresponsive"].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="w-full sm:w-40 h-9 text-[13px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="intent">Sort by intent</SelectItem>
              <SelectItem value="date">Sort by date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard leads={leads} intentScores={intentScores} onLeadUpdated={handleLeadStatusUpdate} />
      )}

      {viewMode === 'list' && (
        filtered.length === 0 ? (
          <div className="surface rounded-xl">
            <EmptyState
              icon={Users}
              title={leads.length === 0 ? "No leads yet" : "No leads match your filters"}
              description={
                leads.length === 0
                  ? "Connect your Gmail inbox and BeaconIQ will automatically capture inbound leads. Or import a CSV to get started right away."
                  : "Try adjusting your search or status filter"
              }
            >
              {leads.length === 0 ? (
                <>
                  <Button onClick={() => setShowImport(true)} variant="outline" className="h-8 text-[12px] gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Import CSV
                  </Button>
                  <Button onClick={() => setShowAdd(true)} className="h-8 text-[12px] gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add manually
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setSearch(""); setStatusFilter("all"); }} variant="outline" className="h-8 text-[12px]">Clear filters</Button>
              )}
            </EmptyState>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex-1 surface rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lead</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Company</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Intent</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Source</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((lead) => {
                      const src = SOURCE_STYLES[lead.source] || SOURCE_STYLES["Manual Entry"];
                      const isSelected = selectedLead?.id === lead.id;
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className={`border-b border-border last:border-b-0 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-secondary/40"}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                {initials(lead.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-medium text-white truncate">{lead.name}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{lead.email}</p>
                              </div>
                              {reminderLeadIds.has(lead.id) && (
                                <Clock className="h-3 w-3 flex-shrink-0 text-warning" title="Follow-up due" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-foreground/90">{lead.company || "—"}</td>
                          <td className="px-4 py-3"><IntentScoreBadge score={intentScores[lead.id]} /></td>
                          <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: src.bg, color: src.color }}>
                              {lead.source || "Manual"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-muted-foreground hidden lg:table-cell">{lastActivity(lead)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedLead && (
              <div className="hidden xl:block w-80 flex-shrink-0">
                <LeadPreviewPanel lead={selectedLead} intentScore={intentScores[selectedLead.id]} onClose={() => setSelectedLead(null)} />
              </div>
            )}
          </div>
        )
      )}

      <AddLeadDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={loadLeads} />
      <ImportLeadsDialog open={showImport} onClose={() => setShowImport(false)} onSuccess={loadLeads} />
    </div>
  );
}

function LeadPreviewPanel({ lead, intentScore, onClose }) {
  return (
    <div className="surface rounded-xl overflow-hidden sticky top-6">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        <button onClick={onClose} className="h-6 w-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 text-[13px] font-semibold bg-primary/10 text-primary border border-primary/20">
            {lead.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">{lead.name}</p>
            <p className="text-[12px] text-muted-foreground truncate">{lead.title || "—"}</p>
          </div>
        </div>
        <div className="space-y-2.5 mb-4">
          <PreviewRow icon={Mail} text={lead.email} />
          {lead.company && <PreviewRow icon={Building} text={lead.company} />}
          {lead.title && <PreviewRow icon={Briefcase} text={lead.title} />}
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <StatusBadge status={lead.status} />
          <IntentScoreBadge score={intentScore} />
        </div>
        <Link
          to={`/leads/${lead.id}`}
          className="inline-flex items-center justify-center gap-1.5 h-9 w-full rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
        >
          Open detail <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PreviewRow({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-foreground/90">
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}