import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Gauge } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/PageHeader";
import SeoScoreCard from "@/components/seo/SeoScoreCard";
import SeoSignalsGrid from "@/components/seo/SeoSignalsGrid";
import SeoRecommendations from "@/components/seo/SeoRecommendations";

export default function SeoScore() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const runAnalysis = async () => {
    if (!url.trim()) {
      toast({ title: "URL required", description: "Enter a website URL to analyze.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("analyzeSeoUrl", { url: url.trim() });
      if (res.data?.error) {
        toast({ title: "Analysis failed", description: res.data.error, variant: "destructive" });
      } else {
        setResult(res.data);
      }
    } catch (e) {
      toast({ title: "Analysis failed", description: e.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis;
  const signals = result?.signals;
  const sub = analysis?.sub_scores;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="SEO Score"
        description="Enter any URL to get an AI-powered SEO score, signal breakdown, and prioritized recommendations."
      />

      <div className="surface-elevated rounded-xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && runAnalysis()}
              className="pl-9 h-11"
              disabled={loading}
            />
          </div>
          <Button onClick={runAnalysis} disabled={loading} className="h-11 px-6">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
            {loading ? "Analyzing..." : "Run SEO Score"}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="surface rounded-xl p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Fetching page and analyzing SEO signals...</p>
        </div>
      )}

      {!loading && !result && (
        <div className="surface rounded-xl p-12 text-center">
          <Gauge className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No analysis yet</p>
          <p className="text-xs text-muted-foreground mt-1">Enter a URL above to run your first SEO score.</p>
        </div>
      )}

      {!loading && result && analysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
              <SeoScoreCard score={analysis.overall_score} label="Overall" sublabel={signals?.url} />
            </div>
            {sub && (
              <>
                <SeoScoreCard score={sub.on_page?.score} label="On-Page" sublabel={sub.on_page?.reasoning} />
                <SeoScoreCard score={sub.content?.score} label="Content" sublabel={sub.content?.reasoning} />
                <SeoScoreCard score={sub.technical?.score} label="Technical" sublabel={sub.technical?.reasoning} />
                <SeoScoreCard score={sub.social?.score} label="Social" sublabel={sub.social?.reasoning} />
              </>
            )}
          </div>

          {analysis.summary && (
            <div className="surface rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2">Summary</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SeoSignalsGrid signals={signals} />
            <SeoRecommendations
              recommendations={analysis.recommendations || []}
              strengths={analysis.strengths || []}
            />
          </div>
        </div>
      )}
    </div>
  );
}