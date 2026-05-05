import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Mail } from "lucide-react";

export default function SendConfirmModal({ open, leadName, onConfirm, onCancel, onRemindLater }) {
  const [reminded, setReminded] = useState(false);

  const handleRemindLater = () => {
    setReminded(true);
    onRemindLater();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm" onInteractOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(59,130,246,0.15)" }}>
              <Mail className="h-5 w-5" style={{ color: "#3B82F6" }} />
            </div>
            <DialogTitle className="text-base">Did you send that email?</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm" style={{ color: "#94A3B8" }}>
          Gmail was opened for <strong className="text-white">{leadName}</strong>. Did you actually send the email?
        </p>
        <div className="space-y-2 mt-2">
          <Button
            className="w-full gap-2 justify-start"
            style={{ background: "#10B981", border: "none", color: "#fff" }}
            onClick={onConfirm}
          >
            <CheckCircle className="h-4 w-4" />
            Yes, I sent it
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 justify-start"
            onClick={onCancel}
          >
            <XCircle className="h-4 w-4" />
            No, I didn't send it
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 justify-start text-xs"
            style={{ color: "#94A3B8" }}
            onClick={handleRemindLater}
            disabled={reminded}
          >
            <Clock className="h-3.5 w-3.5" />
            {reminded ? "Reminder set for 5 minutes" : "Remind me in 5 minutes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}