import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ImportLeadsDialog({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          leads: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                company: { type: "string" },
                title: { type: "string" },
                phone: { type: "string" },
                industry: { type: "string" }
              },
              required: ["name", "email"]
            }
          }
        }
      }
    });

    if (extracted.status === "success" && extracted.output?.leads?.length > 0) {
      const leadsToCreate = extracted.output.leads.map(l => ({
        ...l,
        source: "CSV Upload",
        status: "New",
        priority: "Medium"
      }));
      await base44.entities.Lead.bulkCreate(leadsToCreate);
      setResult({ count: leadsToCreate.length });
      toast({ title: `${leadsToCreate.length} leads imported successfully` });
      onSuccess();
    } else {
      toast({ title: "Import failed", description: "Could not extract leads from the file", variant: "destructive" });
    }
    
    setImporting(false);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file with columns: name, email, company, title, phone</DialogDescription>
        </DialogHeader>
        
        {result ? (
          <div className="flex flex-col items-center py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-foreground">{result.count} leads imported</p>
            <p className="text-sm text-muted-foreground mt-1">Your leads are ready for outreach</p>
            <Button className="mt-6" onClick={handleClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLS, XLSX supported</p>
                </>
              )}
              <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importing..." : "Import Leads"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}