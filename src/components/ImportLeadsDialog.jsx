import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const LEAD_FIELDS = ["name", "email", "company", "title", "phone", "industry", "skip", "custom"];
const REQUIRED_FIELDS = ["name", "email"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1, 4).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
  return { headers, rows };
}

export default function ImportLeadsDialog({ open, onClose, onSuccess }) {
  const [step, setStep] = useState("upload"); // upload | mapping | importing | done
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState([]);
  const [sampleRows, setSampleRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleFile = async (f) => {
    setFile(f);
    const text = await f.text();
    setCsvText(text);
    const { headers: h, rows: r } = parseCSV(text);
    setHeaders(h);
    setSampleRows(r);
  };

  const analyzeMapping = async () => {
    setAnalyzing(true);
    const sampleData = sampleRows.map(row => {
      const obj = {};
      headers.forEach(h => { obj[h] = row[h] || ""; });
      return obj;
    });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a data mapping assistant. Given these CSV column headers and sample data, map each column to the closest RevFlow lead field. RevFlow fields are: name, email, company, title, phone, industry. Return ONLY a valid JSON object where each key is the original CSV column header and each value is the mapped RevFlow field name or 'custom' if it doesn't match any standard field. Example: { "Full Name": "name", "Work Email": "email", "Organization": "company", "Job Function": "title", "Mobile": "phone", "Vertical": "industry", "Budget": "custom" }

CSV Headers: ${JSON.stringify(headers)}
Sample Data: ${JSON.stringify(sampleData)}`,
      response_json_schema: {
        type: "object",
        properties: {}
      }
    });

    // Ensure all headers have a mapping
    const finalMapping = {};
    headers.forEach(h => {
      const val = result[h];
      finalMapping[h] = LEAD_FIELDS.includes(val) ? val : "custom";
    });
    setMapping(finalMapping);
    setAnalyzing(false);
    setStep("mapping");
  };

  const getMappedFields = () => Object.values(mapping);
  const isMapped = (field) => getMappedFields().includes(field);

  const runImport = async () => {
    setImporting(true);
    setStep("importing");

    // Parse all rows
    const allLines = csvText.trim().split("\n");
    const allRows = allLines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });

    let imported = 0, skippedMissing = 0, duplicates = 0, customFieldCols = 0;
    const customHeaders = headers.filter(h => mapping[h] === "custom");
    if (customHeaders.length > 0) customFieldCols = customHeaders.length;

    // Fetch existing emails for duplicate check
    const existingLeads = await base44.entities.Lead.list("-created_date", 1000);
    const existingEmails = new Set(existingLeads.map(l => l.email?.toLowerCase()).filter(Boolean));

    const leadsToCreate = [];

    for (const row of allRows) {
      const lead = {};
      const customFields = {};

      headers.forEach(h => {
        const field = mapping[h];
        if (field === "skip" || !field) return;
        if (field === "custom") {
          if (row[h]) customFields[h] = row[h];
        } else {
          lead[field] = row[h] || "";
        }
      });

      if (!lead.name && !lead.email) { skippedMissing++; continue; }
      if (!lead.name) { skippedMissing++; continue; }
      if (!lead.email) { skippedMissing++; continue; }
      if (existingEmails.has(lead.email.toLowerCase())) { duplicates++; continue; }

      leadsToCreate.push({
        ...lead,
        source: "CSV Upload",
        status: "New",
        priority: "Medium",
        ...(Object.keys(customFields).length > 0 ? { custom_fields: JSON.stringify(customFields) } : {})
      });
      existingEmails.add(lead.email.toLowerCase());
    }

    if (leadsToCreate.length > 0) {
      await base44.entities.Lead.bulkCreate(leadsToCreate);
      imported = leadsToCreate.length;
    }

    setSummary({ imported, skippedMissing, duplicates, customFieldCols });
    setImporting(false);
    setStep("done");
    onSuccess();
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setCsvText("");
    setHeaders([]);
    setSampleRows([]);
    setMapping({});
    setSummary(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "mapping" ? "sm:max-w-3xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Leads from CSV"}
            {step === "mapping" && "Review Column Mapping"}
            {step === "importing" && "Importing Leads..."}
            {step === "done" && "Import Complete"}
          </DialogTitle>
          {step === "upload" && <DialogDescription>Upload any CSV file — AI will map the columns automatically</DialogDescription>}
          {step === "mapping" && <DialogDescription>Review and adjust how your CSV columns map to lead fields</DialogDescription>}
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
              {file ? (
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · {headers.length} columns detected</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Drop your CSV here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV supported</p>
                </>
              )}
              <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={analyzeMapping} disabled={!file || analyzing} className="gap-2">
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {analyzing ? "Analyzing columns..." : "Analyze & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            {REQUIRED_FIELDS.filter(f => !isMapped(f)).map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>⚠️ We couldn't detect which column is <strong>{f}</strong>. Please select it manually below.</span>
              </div>
            ))}

            <div className="overflow-auto max-h-96 rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">CSV Column</th>
                    <th className="text-left px-3 py-2 font-medium">Sample Data</th>
                    <th className="text-left px-3 py-2 font-medium">Mapped To</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map(h => {
                    const isRequired = REQUIRED_FIELDS.includes(mapping[h]);
                    const sample = sampleRows[0]?.[h] || "—";
                    return (
                      <tr key={h} className={`border-t border-border ${isRequired ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-2 font-medium text-foreground">{h}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]">{sample}</td>
                        <td className="px-3 py-2">
                          <select
                            value={mapping[h] || "skip"}
                            onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                            className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="skip">Skip this column</option>
                            <option value="name">name ★</option>
                            <option value="email">email ★</option>
                            <option value="company">company</option>
                            <option value="title">title</option>
                            <option value="phone">phone</option>
                            <option value="industry">industry</option>
                            <option value="custom">Custom Field</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button
                onClick={runImport}
                disabled={!isMapped("name") || !isMapped("email")}
              >
                Confirm Import
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Importing your leads, please wait...</p>
          </div>
        )}

        {/* STEP: Done */}
        {step === "done" && summary && (
          <div className="flex flex-col items-center py-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-foreground">Import Complete</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✅ <strong>{summary.imported}</strong> leads imported</p>
              {summary.skippedMissing > 0 && <p>⚠️ <strong>{summary.skippedMissing}</strong> skipped (missing name/email)</p>}
              {summary.duplicates > 0 && <p>🔁 <strong>{summary.duplicates}</strong> duplicates skipped</p>}
              {summary.customFieldCols > 0 && <p>📋 <strong>{summary.customFieldCols}</strong> columns saved as custom fields</p>}
            </div>
            <Button className="mt-4" onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}