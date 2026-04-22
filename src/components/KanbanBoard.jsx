import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import moment from "moment";

const COLUMNS = [
  { id: "New",            label: "New",            color: "#60A5FA" },
  { id: "Contacted",      label: "Contacted",      color: "#A78BFA" },
  { id: "Interested",     label: "Qualified",      color: "#FBBF24" },
  { id: "Meeting Booked", label: "Meeting Booked", color: "#10B981" },
  { id: "Closed",         label: "Closed Won",     color: "#34D399" },
  { id: "Unresponsive",   label: "Closed Lost",    color: "#94A3B8" },
];

function intentColor(score) {
  if (score == null) return { bg: "rgba(148,163,184,0.12)", color: "#94A3B8" };
  if (score >= 70)  return { bg: "rgba(16,185,129,0.12)", color: "#34D399" };
  if (score >= 40)  return { bg: "rgba(245,158,11,0.12)", color: "#FBBF24" };
  return { bg: "rgba(148,163,184,0.1)", color: "#94A3B8" };
}

function initials(name) {
  return name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function KanbanBoard({ leads, intentScores, onLeadUpdated }) {
  const [dragging, setDragging] = useState(false);

  const byStatus = {};
  COLUMNS.forEach(col => { byStatus[col.id] = []; });
  leads.forEach(lead => {
    if (byStatus[lead.status] !== undefined) {
      byStatus[lead.status].push(lead);
    } else {
      byStatus["New"].push(lead);
    }
  });

  const onDragEnd = async (result) => {
    setDragging(false);
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const leadId = result.draggableId;
    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    onLeadUpdated(leadId, newStatus);

    try {
      await base44.entities.Lead.update(leadId, { status: newStatus });
    } catch (err) {
      console.error("[KanbanBoard] Failed to update lead status:", err);
      // Revert
      onLeadUpdated(leadId, lead.status);
    }
  };

  return (
    <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
        {COLUMNS.map(col => {
          const colLeads = byStatus[col.id] || [];
          return (
            <div key={col.id} className="flex-shrink-0 w-64 flex flex-col surface rounded-xl">
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: col.color }} />
                  <span className="text-[12px] font-semibold text-white">{col.label}</span>
                </div>
                <span
                  className="text-[11px] font-medium px-1.5 py-0.5 rounded-md min-w-[22px] text-center"
                  style={{ background: `${col.color}20`, color: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 flex flex-col gap-2 p-2 transition-colors rounded-b-xl"
                    style={{ background: snapshot.isDraggingOver ? "rgba(59,130,246,0.06)" : "transparent", minHeight: 80 }}
                  >
                    {colLeads.map((lead, index) => {
                      const score = intentScores[lead.id];
                      const ic = intentColor(score);
                      return (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="rounded-lg p-3 cursor-grab active:cursor-grabbing select-none bg-secondary border border-border transition-all"
                              style={{
                                borderColor: snapshot.isDragging ? "hsl(var(--primary))" : undefined,
                                boxShadow: snapshot.isDragging ? "0 12px 32px rgba(0,0,0,0.5)" : "none",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                  {initials(lead.name)}
                                </div>
                                <Link to={`/leads/${lead.id}`} className="text-[12px] font-medium text-white hover:underline truncate" onClick={e => e.stopPropagation()}>
                                  {lead.name}
                                </Link>
                              </div>
                              {lead.company && (
                                <p className="text-[11px] mb-2 truncate text-muted-foreground">{lead.company}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: ic.bg, color: ic.color }}>
                                  {score != null ? `Intent ${score}` : "No score"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{moment(lead.created_date).fromNow(true)}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}