import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { getOrCreateWorkspace } from "@/lib/workspace";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  { title: "Tell us about your business", subtitle: "This helps AI craft personalized emails" },
  { title: "Who do you sell to?", subtitle: "Define your target audience and tone" },
  { title: "What's your goal?", subtitle: "We'll optimize outreach for your objective" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    description: "",
    industry: "",
    target_audience: "",
    products_services: "",
    tone: "Professional",
    sales_goal: "Book a Meeting",
    website: "",
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
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <TrendingUp className="h-5 w-5" style={{ color: '#3B82F6' }} />
          </div>
          <span className="text-2xl font-bold tracking-tight"><span className="text-white">Beacon</span><span style={{ color: '#F59E0B' }}>IQ</span></span>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-xl font-bold text-foreground mb-1">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{steps[step].subtitle}</p>

            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              {step === 0 && (
                <>
                  <div>
                    <Label>Business Name *</Label>
                    <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} placeholder="Acme Agency" />
                  </div>
                  <div>
                    <Label>Industry *</Label>
                    <Select value={form.industry} onValueChange={v => setForm({...form, industry: v})}>
                      <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {["Marketing Agency", "Lead Generation", "SaaS", "Consulting", "E-commerce", "Real Estate", "Financial Services", "Other"].map(i => (
                          <SelectItem key={i} value={i}>{i}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>What does your business do? *</Label>
                    <Textarea 
                      value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})} 
                      placeholder="We help e-commerce brands scale their digital marketing..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Website</Label>
                    <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} placeholder="https://yourcompany.com" />
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div>
                    <Label>Target Audience *</Label>
                    <Textarea 
                      value={form.target_audience} 
                      onChange={e => setForm({...form, target_audience: e.target.value})} 
                      placeholder="B2B SaaS founders, e-commerce brands doing $1M+ revenue..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Products / Services</Label>
                    <Textarea 
                      value={form.products_services} 
                      onChange={e => setForm({...form, products_services: e.target.value})} 
                      placeholder="SEO services, paid ads management, content marketing..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Communication Tone *</Label>
                    <Select value={form.tone} onValueChange={v => setForm({...form, tone: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Label>Primary Sales Goal *</Label>
                    <Select value={form.sales_goal} onValueChange={v => setForm({...form, sales_goal: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Book a Meeting", "Schedule a Demo", "Close a Deal", "Get a Response", "Drive Traffic"].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3 mt-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">You're all set!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">AI will use this context to craft personalized, high-converting emails for your leads.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button 
            variant="ghost" 
            onClick={() => setStep(s => s - 1)} 
            disabled={step === 0}
          >
            Back
          </Button>
          {step < 2 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="gap-2">
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving || !canNext()} className="gap-2">
              {saving ? "Setting up..." : "Get Started"} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}