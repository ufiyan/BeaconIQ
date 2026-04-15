import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import IntentScoreBadge from "../components/IntentScoreBadge";
import { Link } from "react-router-dom";
import { Users, Plus, Upload, Search, Clock, LayoutList, Columns } from "lucide-react";
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

const PRIORITY_DOTS = {
  High: "#EF4444",
  Medium: "#F59E0B",
  Low: "#94A3B8",
};

const SOURCE_STYLES = {
  "CSV Upload": { bg: "rgba(139,92,246,0.15)", color: "#A78BFA" },
  "Email Ingestion": { bg: "rgba(59,130,246,0.15)", color: "#3B82F6" },
  "Manual Entry": { bg: "rgba(148,163,184,0.1)", color: "#94A3B8" },
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
        <SkeletonTable rows={8} cols={7} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Leads" description={`${leads.length} total leads`}>
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '0.5px solid hsl(var(--border))' }}>
          <button onClick={() => setViewMode('list')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors" style={{ background: viewMode === 'list' ? 'hsl(var(--secondary))' : 'transparent', color: viewMode === 'list' ? 'white' : '#94A3B8' }}>
            <LayoutList className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => setViewMode('kanban')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors" style={{ background: viewMode === 'kanban' ? 'hsl(var(--secondary))' : 'transparent', color: viewMode === 'kanban' ? 'white' : '#94A3B8' }}>
            <Columns className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
        {viewMode === 'list' && (
          <div className="flex rounded-lg overflow-hidden" style={{ border: '0.5px solid hsl(var(--border))' }}>
            <button onClick={() => setSortMode('intent')} className="px-3 py-1 text-xs transition-colors" style={{ background: sortMode === 'intent' ? 'hsl(var(--secondary))' : 'transparent', color: sortMode === 'intent' ? '#F59E0B' : '#94A3B8' }}>By Intent</button>
            <button onClick={() => setSortMode('date')} className="px-3 py-1 text-xs transition-colors" style={{ background: sortMode === 'date' ? 'hsl(var(--secondary))' : 'transparent', color: sortMode === 'date' ? 'white' : '#94A3B8' }}>By Date</button>
          </div>
        )}
        <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2 text-xs h-8">
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
        <Button onClick={() => setShowAdd(true)} className="gap-2 text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </Button>
      </PageHeader>

      {/* Filters — list view only */}
      {viewMode === 'list' && <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#94A3B8" }} />
          <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-8 text-xs">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {["New","Contacted","Replied","Interested","Meeting Booked","Closed","Unresponsive"].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>}

      {/* Kanban view */}
      {viewMode === 'kanban' && (
        <KanbanBoard leads={leads} intentScores={intentScores} onLeadUpdated={handleLeadStatusUpdate} />
      )}

      {/* List view */}
      {viewMode === 'list' && (
        filtered.length === 0 ? (
          <EmptyState icon={Users} title="No leads found" description={search ? "Try a different search" : "No leads yet. Connect your Gmail inbox and BeaconIQ will automatically find leads in your emails."}>
            {!search && (
              <Button onClick={() => setShowImport(true)} className="text-xs h-8" style={{ background: "#F59E0B", color: "#000", border: "none" }}>Import leads</Button>
            )}
          </EmptyState>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                    {["Name","Company","Status","IQ Score","Priority","Source","Added"].map((h, i) => (
                      <th key={h} className={`text-left px-4 py-3 text-xs font-medium ${i > 2 ? "hidden md:table-cell" : ""}`} style={{ color: "#94A3B8" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead, idx) => {
                    const src = SOURCE_STYLES[lead.source] || SOURCE_STYLES["Manual Entry"];
                    return (
                      <tr key={lead.id} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(30,41,59,0.3)", borderBottom: "0.5px solid hsl(var(--border))" }}>
                        <td className="px-4 py-3">
                          <Link to={`/leads/${lead.id}`} className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                              {initials(lead.name)}
                            </div>
                            <span className="text-xs font-medium text-white hover:underline">{lead.name}</span>
                            {reminderLeadIds.has(lead.id) && (
                              <Clock className="h-3 w-3 flex-shrink-0" style={{ color: "#F59E0B" }} title="Follow-up due" />
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>{lead.company || "—"}</td>
                        <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: "#94A3B8" }}>{lead.title || "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell"><StatusBadge status={lead.status} /></td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <IntentScoreBadge score={intentScores[lead.id]} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ background: PRIORITY_DOTS[lead.priority || "Medium"] }} />
                            <span className="text-xs" style={{ color: "#94A3B8" }}>{lead.priority || "Medium"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: src.bg, color: src.color }}>
                            {lead.source || "Manual"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs hidden md:table-cell" style={{ color: "#94A3B8" }}>{moment(lead.created_date).fromNow()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <AddLeadDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={loadLeads} />
      <ImportLeadsDialog open={showImport} onClose={() => setShowImport(false)} onSuccess={loadLeads} />
    </div>
  );
}