import { cn } from "@/lib/utils";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

/* ------------------------------------------------------------------ */
/*  Dialog (root wrapper – controlled via `open` prop)                */
/* ------------------------------------------------------------------ */
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* content container */}
      {children}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  DialogContent                                                     */
/* ------------------------------------------------------------------ */
const DialogContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="dialog"
      className={cn(
        "relative z-50 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl",
        "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
DialogContent.displayName = "DialogContent";

/* ------------------------------------------------------------------ */
/*  DialogHeader / DialogFooter                                       */
/* ------------------------------------------------------------------ */
function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex justify-end gap-2 pt-4", className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/*  DialogTitle / DialogDescription                                   */
/* ------------------------------------------------------------------ */
const DialogTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-slate-900", className)}
      {...props}
    />
  ),
);
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-slate-500", className)}
      {...props}
    />
  ),
);
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
