import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import moment from "moment";

const COLUMNS = [
  { id: "New", label: "New Lead" },
  { id: "Contacted", label: "Contacted" },
  { id: "Interested", label: "Qualified" },
  { id: "Meeting Booked", label: "Proposal Sent" },
  { id: "Closed", label: "Closed Won" },
  { id: "Unresponsive", label: "Closed Lost" },
];

function intentColor(score) {
  if (score == null) return { bg: "rgba(148,163,184,0.15)", color: "#94A3B8" };
  if (score >= 70) return { bg: "rgba(34,197,94,0.15)", color: "#22C55E" };
  if (score >= 40) return { bg: "rgba(245,158,11,0.15)", color: "#F59E0B" };
  return { bg: "rgba(239,68,68,0.15)", color: "#EF4444" };
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
            <div key={col.id} className="flex-shrink-0 w-64 flex flex-col rounded-xl" style={{ background: "hsl(var(--card))", border: "0.5px solid hsl(var(--border))" }}>
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "0.5px solid hsl(var(--border))" }}>
                <span className="text-xs font-semibold text-white">{col.label}</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
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
                    style={{ background: snapshot.isDraggingOver ? "rgba(59,130,246,0.05)" : "transparent", minHeight: 80 }}
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
                              className="rounded-lg p-3 cursor-grab active:cursor-grabbing select-none"
                              style={{
                                background: snapshot.isDragging ? "hsl(215,35%,22%)" : "hsl(215,35%,18%)",
                                border: snapshot.isDragging ? "0.5px solid #3B82F6" : "0.5px solid hsl(var(--border))",
                                boxShadow: snapshot.isDragging ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium" style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>
                                  {initials(lead.name)}
                                </div>
                                <Link to={`/leads/${lead.id}`} className="text-xs font-medium text-white hover:underline truncate leading-none" onClick={e => e.stopPropagation()}>
                                  {lead.name}
                                </Link>
                              </div>
                              {lead.company && (
                                <p className="text-xs mb-2 truncate" style={{ color: "#94A3B8" }}>{lead.company}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: ic.bg, color: ic.color }}>
                                  {score != null ? `IQ ${score}` : "No score"}
                                </span>
                                <span className="text-xs" style={{ color: "#64748B" }}>{moment(lead.created_date).fromNow()}</span>
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