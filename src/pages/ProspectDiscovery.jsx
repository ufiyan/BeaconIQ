import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Telescope, Play, RefreshCw, Bookmark, Target, Loader2, Filter, Search, Zap, ChevronRight } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import ProspectCard from "@/components/prospect/ProspectCard";
import ProspectDetailPanel from "@/components/prospect/ProspectDetailPanel";

const INDUSTRY_FILTERS = ["All", "SaaS", "Technology", "Marketing Agency", "Fintech", "Healthcare", "E-commerce", "Consulting", "Real Estate"];
const SIZE_FILTERS = ["All", "1-50", "51-200", "201-500", "501-1000", "1000+"];
const SIGNAL_FILTERS = ["All", "funding", "hiring", "leadership_change", "product_launch", "pricing_page", "tech_stack", "news"];

export default function ProspectDiscovery() {
  const { workspace } = useWorkspace();
  const { toast } = useToast();

  const [prospects, setProspects] = useState([]);
  const [signalsMap, setSignalsMap] = useState({});
  const [contactsMap, setContactsMap] = useState({});
  const [icps, setIcps] = useState([]);
  const [selectedIcp, setSelectedIcp] = useState("");
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("All");
  const [filterSize, setFilterSize] = useState("All");
  const [filterSignal, setFilterSignal] = useState("All");
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [statusFilter, setStatusFilter] = useState("active");

  useEffect(() => {
    if (workspace?.id) {
      loadAll();
    }
  }, [workspace?.id]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const [prospectsData, icpsData] = await Promise.all([
        base44.entities.Prospect.filter({ created_by: user.email }, "-opportunity_score", 200),
        base44.entities.IdealCustomerProfile.filter({ created_by: user.email }, "-created_date", 20),
      ]);
      setProspects(prospectsData);
      setIcps(icpsData);
      if (icpsData.length && !selectedIcp) setSelectedIcp(icpsData[0].id);

      // Load signals + contacts for all prospects
      if (prospectsData.length) {
        const [allSignals, allContacts] = await Promise.all([
          base44.entities.ProspectSignal.filter({ created_by: user.email }, "-signal_date", 1000),
          base44.entities.ProspectContact.filter({ created_by: user.email }, "-created_date", 1000),
        ]);
        const sMap = {};
        allSignals.forEach(s => { if (!sMap[s.prospect_id]) sMap[s.prospect_id] = []; sMap[s.prospect_id].push(s); });
        const cMap = {};
        allContacts.forEach(c => { if (!cMap[c.prospect_id]) cMap[c.prospect_id] = []; cMap[c.prospect_id].push(c); });
        setSignalsMap(sMap);
        setContactsMap(cMap);
      }
    } catch (e) {
      toast({ title: "Error loading prospects", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRunDiscovery = async () => {
    if (!selectedIcp) return toast({ title: "Select an ICP first", description: "Create one in ICP Settings if you haven't yet." });
    if (!workspace?.id) return toast({ title: "No workspace found" });
    setRunning(true);
    try {
      const res = await base44.functions.invoke("runProspectDiscovery", { icp_id: selectedIcp, workspace_id: workspace.id });
      toast({ title: `Discovery complete!`, description: `Found ${res.data.prospects_found} new prospects.` });
      await loadAll();
    } catch (e) {
      toast({ title: "Discovery failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleSaveToLeads = async (prospect) => {
    try {
      const res = await base44.functions.invoke("convertProspectToLead", { prospect_id: prospect.id });
      if (res.data.duplicate) {
        toast({ title: "Duplicate detected", description: res.data.message });
      } else {
        toast({ title: "Lead created!", description: `${prospect.company_name} added to your leads.` });
        setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, status: "Converted" } : p));
        if (selectedProspect?.id === prospect.id) setSelectedProspect(prev => ({ ...prev, status: "Converted" }));
      }
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDismiss = async (prospect) => {
    await base44.entities.Prospect.update(prospect.id, { status: "Dismissed" });
    setProspects(prev => prev.map(p => p.id === prospect.id ? { ...p, status: "Dismissed" } : p));
    if (selectedProspect?.id === prospect.id) setSelectedProspect(null);
  };

  const handleSaveSelected = async () => {
    const active = filteredProspects.filter(p => p.status === "New" || p.status === "Saved");
    for (const p of active.slice(0, 5)) await handleSaveToLeads(p);
    toast({ title: `Saved ${Math.min(active.length, 5)} prospects to leads!` });
  };

  // Filtering
  const filteredProspects = prospects.filter(p => {
    if (statusFilter === "active" && (p.status === "Dismissed" || p.status === "Converted")) return false;
    if (statusFilter === "dismissed" && p.status !== "Dismissed") return false;
    if (statusFilter === "converted" && p.status !== "Converted") return false;
    if (searchTerm && !p.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterIndustry !== "All" && !p.industry?.toLowerCase().includes(filterIndustry.toLowerCase())) return false;
    if (filterSize !== "All") {
      const emp = p.employee_count || 0;
      if (filterSize === "1-50" && emp > 50) return false;
      if (filterSize === "51-200" && (emp < 51 || emp > 200)) return false;
      if (filterSize === "201-500" && (emp < 201 || emp > 500)) return false;
      if (filterSize === "501-1000" && (emp < 501 || emp > 1000)) return false;
      if (filterSize === "1000+" && emp <= 1000) return false;
    }
    if (filterSignal !== "All") {
      const sigs = signalsMap[p.id] || [];
      if (!sigs.some(s => s.signal_type === filterSignal)) return false;
    }
    if ((p.opportunity_score || 0) < filterMinScore) return false;
    return true;
  });

  const activeCount = prospects.filter(p => p.status !== "Dismissed" && p.status !== "Converted").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${selectedProspect ? "lg:max-w-[calc(100%-380px)]" : ""}`}>
        <div className="overflow-y-auto flex-1">
          <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Telescope className="h-6 w-6" style={{ color: "#3B82F6" }} />
                  Prospect Discovery
                </h1>
                <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
                  Find high-propensity companies before they ever email you.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {icps.length === 0 ? (
                  <Link to="/icp-settings">
                    <Button variant="outline" className="gap-2 text-sm">
                      <Target className="h-4 w-4" /> Setup ICP First
                    </Button>
                  </Link>
                ) : (
                  <Select value={selectedIcp} onValueChange={setSelectedIcp}>
                    <SelectTrigger className="w-48 text-sm">
                      <SelectValue placeholder="Select ICP..." />
                    </SelectTrigger>
                    <SelectContent>
                      {icps.map(icp => <SelectItem key={icp.id} value={icp.id}>{icp.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={handleRunDiscovery} disabled={running || !selectedIcp} className="gap-2">
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {running ? "Discovering..." : "Run Discovery"}
                </Button>
                <Button onClick={loadAll} variant="outline" size="icon" title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={handleSaveSelected} variant="outline" className="gap-2 text-sm" style={{ color: "#10B981", borderColor: "rgba(16,185,129,0.3)" }}>
                  <Bookmark className="h-4 w-4" /> Save Selected
                </Button>
              </div>
            </div>

            {/* Score Legend */}
            <div className="flex flex-wrap gap-4 mb-4 px-1">
              {[
                { label: "Fit Score", desc: "How well the company matches your ICP (industry, size, location)", color: "#3B82F6" },
                { label: "Timing Score", desc: "How strong & recent their buying signals are", color: "#F59E0B" },
                { label: "Opportunity Score", desc: "Combined weighted score — prioritize by this", color: "#10B981" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
                  <span className="text-xs hidden sm:inline" style={{ color: "#475569" }}>— {s.desc}</span>
                </div>
              ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Prospects", value: prospects.length, color: "#3B82F6" },
                { label: "Active", value: activeCount, color: "#F59E0B" },
                { label: "Converted to Leads", value: prospects.filter(p => p.status === "Converted").length, color: "#10B981" },
                { label: "Avg Opportunity Score", value: prospects.length ? Math.round(prospects.reduce((a, p) => a + (p.opportunity_score || 0), 0) / prospects.length) : 0, color: "#8B5CF6" },
              ].map(stat => (
                <div key={stat.label} className="rounded-xl p-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="rounded-xl p-4 mb-4" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#64748B" }} />
                  <Input
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                  <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Industry" /></SelectTrigger>
                  <SelectContent>{INDUSTRY_FILTERS.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterSize} onValueChange={setFilterSize}>
                  <SelectTrigger className="w-32 text-sm"><SelectValue placeholder="Size" /></SelectTrigger>
                  <SelectContent>{SIZE_FILTERS.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Sizes" : `${s} emp`}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={filterSignal} onValueChange={setFilterSignal}>
                  <SelectTrigger className="w-36 text-sm"><SelectValue placeholder="Signal" /></SelectTrigger>
                  <SelectContent>{SIGNAL_FILTERS.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Signals" : s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prospect List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#3B82F6" }} />
              </div>
            ) : filteredProspects.length === 0 ? (
              <div className="text-center py-20 rounded-xl" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
                {prospects.length === 0 ? (
                  <>
                    <Telescope className="h-12 w-12 mx-auto mb-4" style={{ color: "#3B82F6", opacity: 0.5 }} />
                    <p className="text-white font-semibold mb-2">No prospects discovered yet</p>
                    <p className="text-sm mb-6" style={{ color: "#94A3B8" }}>
                      {icps.length === 0
                        ? "Start by creating an ICP profile to define your ideal customers."
                        : "Run discovery to find companies matching your ICP."}
                    </p>
                    {icps.length === 0 ? (
                      <Link to="/icp-settings"><Button className="gap-2"><Target className="h-4 w-4" /> Create ICP Profile</Button></Link>
                    ) : (
                      <Button onClick={handleRunDiscovery} disabled={running} className="gap-2">
                        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Run Discovery
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Filter className="h-10 w-10 mx-auto mb-3" style={{ color: "#64748B" }} />
                    <p className="text-white font-medium">No prospects match your filters</p>
                    <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>Try adjusting your filter criteria</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium px-1" style={{ color: "#64748B" }}>{filteredProspects.length} prospect{filteredProspects.length !== 1 ? "s" : ""}</p>
                {filteredProspects.map(prospect => (
                  <ProspectCard
                    key={prospect.id}
                    prospect={prospect}
                    signals={signalsMap[prospect.id] || []}
                    isSelected={selectedProspect?.id === prospect.id}
                    onView={() => setSelectedProspect(prospect)}
                    onSave={() => handleSaveToLeads(prospect)}
                    onDismiss={() => handleDismiss(prospect)}
                    onOutreach={() => setSelectedProspect(prospect)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedProspect && (
        <div className="hidden lg:flex w-[380px] flex-shrink-0 h-full">
          <ProspectDetailPanel
            prospect={selectedProspect}
            signals={signalsMap[selectedProspect.id] || []}
            contacts={contactsMap[selectedProspect.id] || []}
            onClose={() => setSelectedProspect(null)}
            onSaved={() => loadAll()}
            onConverted={() => {
              setProspects(prev => prev.map(p => p.id === selectedProspect.id ? { ...p, status: "Converted" } : p));
              setSelectedProspect(prev => ({ ...prev, status: "Converted" }));
            }}
          />
        </div>
      )}
    </div>
  );
}