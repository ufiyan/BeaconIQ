import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const user = await base44.auth.me();
      // Mark account for deletion via user metadata — actual data removal
      // is handled by support / backend process. Keeps it simple and safe.
      await base44.auth.updateMe({
        deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
      });
      toast({
        title: "Account deletion requested",
        description: `We've received your request for ${user.email}. You'll be logged out now.`,
      });
      setTimeout(() => base44.auth.logout(), 1500);
    } catch (e) {
      toast({ title: "Could not process request", description: e.message, variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="surface rounded-xl p-6 border-destructive/30">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-white">Delete account</h3>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Permanently delete your BeaconIQ account, workspace, leads, campaigns, and email history.
            This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            className="mt-4 h-9 text-[13px]"
            onClick={() => { setConfirmText(""); setOpen(true); }}
          >
            Delete my account
          </Button>
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will permanently remove your workspace and all associated leads,
                  campaigns, emails, and settings. This cannot be undone.
                </p>
                <div>
                  <Label className="text-[12px]">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}