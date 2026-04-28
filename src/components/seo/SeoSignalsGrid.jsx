import { CheckCircle2, AlertCircle, MinusCircle } from "lucide-react";

function Row({ label, value, status }) {
  const Icon = status === "good" ? CheckCircle2 : status === "warn" ? AlertCircle : MinusCircle;
  const color = status === "good" ? "text-success" : status === "warn" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
        <span className="text-sm text-foreground/90">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground text-right break-all max-w-[60%]">{value}</span>
    </div>
  );
}

export default function SeoSignalsGrid({ signals }) {
  if (!signals) return null;

  const titleStatus = !signals.title ? "bad" : signals.titleLength < 30 || signals.titleLength > 65 ? "warn" : "good";
  const descStatus = !signals.metaDescription ? "bad" : signals.metaDescriptionLength < 70 || signals.metaDescriptionLength > 165 ? "warn" : "good";
  const h1Status = signals.h1Count === 0 ? "bad" : signals.h1Count > 1 ? "warn" : "good";
  const altStatus = signals.imgCount === 0 ? "good" : signals.imgsMissingAlt === 0 ? "good" : signals.imgsMissingAlt <= 2 ? "warn" : "bad";

  return (
    <div className="surface rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-2">Extracted Signals</h3>
      <div>
        <Row label="Title tag" status={titleStatus} value={signals.title ? `${signals.titleLength} chars` : "missing"} />
        <Row label="Meta description" status={descStatus} value={signals.metaDescription ? `${signals.metaDescriptionLength} chars` : "missing"} />
        <Row label="Canonical URL" status={signals.canonical ? "good" : "warn"} value={signals.canonical || "not set"} />
        <Row label="HTML lang attr" status={signals.lang ? "good" : "warn"} value={signals.lang || "not set"} />
        <Row label="H1 tags" status={h1Status} value={`${signals.h1Count} found`} />
        <Row label="H2 tags" status={signals.h2Count > 0 ? "good" : "warn"} value={`${signals.h2Count} found`} />
        <Row label="Image alt coverage" status={altStatus} value={`${signals.imgWithAlt}/${signals.imgCount} have alt`} />
        <Row label="Viewport meta" status={signals.viewport ? "good" : "bad"} value={signals.viewport || "missing"} />
        <Row label="Robots meta" status={signals.robots ? "good" : "warn"} value={signals.robots || "not set"} />
        <Row label="Open Graph title" status={signals.ogTitle ? "good" : "warn"} value={signals.ogTitle ? "set" : "missing"} />
        <Row label="Open Graph image" status={signals.ogImage ? "good" : "warn"} value={signals.ogImage ? "set" : "missing"} />
        <Row label="Twitter card" status={signals.twitterCard ? "good" : "warn"} value={signals.twitterCard || "missing"} />
        <Row label="Structured data (JSON-LD)" status={signals.hasStructuredData ? "good" : "warn"} value={signals.hasStructuredData ? "found" : "missing"} />
        <Row label="HTML size" status={signals.htmlSizeKb < 500 ? "good" : "warn"} value={`${signals.htmlSizeKb} KB`} />
      </div>
    </div>
  );
}