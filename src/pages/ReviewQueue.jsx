import { GitPullRequest } from "lucide-react";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";

export default function ReviewQueue() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Review Queue" description="Leads and emails awaiting your review" />
      <EmptyState icon={GitPullRequest} title="Review Queue is empty" description="Leads flagged for review will appear here" />
    </div>
  );
}