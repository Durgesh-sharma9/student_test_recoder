import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        `
          fixed
          inset-0
          z-50
          bg-black/50
          backdrop-blur-sm
          data-[state=open]:animate-in
          data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0
          data-[state=open]:fade-in-0
        `,
        className
      )}
      {...props}
    />
  )
);

DialogOverlay.displayName =
  DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(
  (
    {
      className,
      children,
      ...props
    },
    ref
  ) => (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          `
            fixed
            left-1/2
            top-1/2
            z-50
            w-full
            max-w-lg
            -translate-x-1/2
            -translate-y-1/2
            rounded-3xl
            border
            border-slate-200
            bg-white
            shadow-2xl
            duration-200
            max-h-[90vh]
            flex
            flex-col

            data-[state=open]:animate-in
            data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0
            data-[state=open]:fade-in-0
            data-[state=closed]:zoom-out-95
            data-[state=open]:zoom-in-95
          `,
          className
        )}
        {...props}
      >
        <DialogPrimitive.Close
          className="
            absolute
            right-5
            top-5
            z-10
            rounded-full
            p-2
            text-slate-500
            hover:bg-slate-100
            hover:text-slate-800
            transition
          "
        >
          <X className="h-4 w-4" />
          <span className="sr-only">
            Close
          </span>
        </DialogPrimitive.Close>

        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);

DialogContent.displayName =
  DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      `
        flex
        flex-col
        space-y-2
        p-6
        pb-4
        flex-shrink-0
      `,
      className
    )}
    {...props}
  />
);

DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        `
          text-xl
          font-bold
          tracking-tight
          text-slate-800
        `,
        className
      )}
      {...props}
    />
  )
);

DialogTitle.displayName =
  DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Description
      ref={ref}
      className={cn(
        `
          text-sm
          text-slate-500
          leading-relaxed
        `,
        className
      )}
      {...props}
    />
  )
);

DialogDescription.displayName =
  DialogPrimitive.Description.displayName;

const DialogFooter = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      `
        flex
        items-center
        justify-end
        gap-3
        p-6
        pt-0
        flex-shrink-0
      `,
      className
    )}
    {...props}
  />
);

DialogFooter.displayName = 'DialogFooter';

const DialogBody = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      `
        flex-1
        overflow-y-auto
        p-6
        pt-0
      `,
      className
    )}
    {...props}
  />
);

DialogBody.displayName = 'DialogBody';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
  DialogClose,
};