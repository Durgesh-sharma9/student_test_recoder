import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog        = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal  = DialogPrimitive.Portal;
const DialogClose   = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-[rgba(25,118,210,0.18)]', className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-[420px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(25,118,210,0.18)] duration-200',
        className
      )}
      {...props}
    >
      {/* Blue modal header strip */}
      <div className="flex items-center justify-between bg-[#1976d2] px-5 py-3.5">
        <span className="text-sm font-semibold text-white">Dialog</span>
        <DialogPrimitive.Close className="text-[#bbdefb] hover:text-white transition-colors">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
      <div className="p-5">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div className={cn('mb-4 flex flex-col space-y-1', className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-sm font-semibold text-white', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose };