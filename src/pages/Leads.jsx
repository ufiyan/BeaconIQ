import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Users, Plus, Upload, Search, Filter } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import AddLeadDialog from "../components/AddLeadDialog";
import ImportLeadsDialog from "../components/ImportLeadsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const loadLeads = async () => {
    const data = await base44.entities.Lead.list("-created_date", 200);
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => { loadLeads(); }, []);

  const filtered = leads.filter(l => {
    const matchSearch = !search || 
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Leads" description={`${leads.length} total leads`}>
        <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Contacted">Contacted</SelectItem>
            <SelectItem value="Replied">Replied</SelectItem>
            <SelectItem value="Interested">Interested</SelectItem>
            <SelectItem value="Meeting Booked">Meeting Booked</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
            <SelectItem value="Unresponsive">Unresponsive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No leads found" description={search ? "Try a different search" : "Add your first leads to get started"}>
          {!search && (
            <Button onClick={() => setShowAdd(true)} size="sm">Add Lead</Button>
          )}
        </EmptyState>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden sm:table-cell">Company</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Priority</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 hidden lg:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link to={`/leads/${lead.id}`} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-primary">{lead.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground hover:text-primary transition-colors">{lead.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{lead.company || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{lead.email}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>
                    <td className="px-5 py-3.5 hidden lg:table-cell"><StatusBadge status={lead.priority || "Medium"} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{moment(lead.created_date).fromNow()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddLeadDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={loadLeads} />
      <ImportLeadsDialog open={showImport} onClose={() => setShowImport(false)} onSuccess={loadLeads} />
    </div>
  );
}