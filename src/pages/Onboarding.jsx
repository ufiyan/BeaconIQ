import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { TrendingUp, ArrowRight, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { title: "Tell us about your business", subtitle: "This helps AI craft personalized outreach" },
  { title: "Who do you sell to?",         subtitle: "Define your target audience and tone" },
  { title: "What's your goal?",           subtitle: "We'll optimize outreach for your objective" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "", description: "", industry: "",
    target_audience: "", products_services: "",
    tone: "Professional", sales_goal: "Book a Meeting", website: "",
  });

  const handleFinish = async () => {
    setSaving(true);
    const user = await base44.auth.me();
    const workspace = await getOrCreateWorkspace(user);
    await base44.entities.BusinessProfile.create({ ...form, onboarding_complete: true, workspace_id: workspace.id });
    setSaving(false);
    navigate("/");
  };

  const canNext = () => {
    if (step === 0) return form.business_name && form.description && form.industry;
    if (step === 1) return form.target_audience && form.tone;
    if (step === 2) return form.sales_goal;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/15 border border-primary/25">
            <TrendingUp className="h-5 w-5 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-[20px] font-semibold tracking-tight text-white">BeaconIQ</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex gap-2 flex-1">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">Step {step + 1} of {steps.length}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <h2 className="text-[22px] font-semibold tracking-tight text-white">{steps[step].title}</h2>
            <p className="text-[13px] text-muted-foreground mt-1 mb-5">{steps[step].subtitle}</p>

            <div className="surface-elevated rounded-xl p-6 space-y-4">
              {step === 0 && (
                <>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Business Name *</Label>
                    <Input className="mt-1.5" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} placeholder="Acme Agency" />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Industry *</Label>
                    <Select value={form.industry} onValueChange={v => setForm({ ...form, industry: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {["Marketing Agency", "Lead Generation", "SaaS", "Consulting", "E-commerce", "Real Estate", "Financial Services", "Other"].map(i => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/90">What does your business do? *</Label>
                    <Textarea className="mt-1.5" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="We help e-commerce brands scale their digital marketing…" rows={3} />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Website</Label>
                    <Input className="mt-1.5" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcompany.com" />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Target Audience *</Label>
                    <Textarea className="mt-1.5" value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} placeholder="B2B SaaS founders, e-commerce brands doing $1M+ revenue…" rows={3} />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Products / Services</Label>
                    <Textarea className="mt-1.5" value={form.products_services} onChange={e => setForm({ ...form, products_services: e.target.value })} placeholder="SEO services, paid ads management, content marketing…" rows={2} />
                  </div>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Communication Tone *</Label>
                    <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Professional", "Friendly", "Casual", "Formal", "Persuasive"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <Label className="text-[12px] text-foreground/90">Primary Sales Goal *</Label>
                    <Select value={form.sales_goal} onValueChange={v => setForm({ ...form, sales_goal: v })}>
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Book a Meeting", "Schedule a Demo", "Close a Deal", "Get a Response", "Drive Traffic"].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg p-4 flex items-start gap-3 bg-accent/8 border border-accent/20">
                    <Sparkles className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[13px] font-medium text-white">You're all set</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">After setup, load demo data or connect Gmail to start capturing inbound leads.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-5">
          <Button variant="ghost" onClick={() => setStep(s => s - 1)} disabled={step === 0} className="gap-1.5 h-9 text-[13px]">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-1.5 h-9 text-[13px]">
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !canNext()} className="gap-1.5 h-9 text-[13px] font-semibold">
              {saving ? "Setting up…" : "Get Started"} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}