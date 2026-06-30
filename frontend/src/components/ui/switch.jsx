import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={className}
    {...props}
    ref={ref}
  />
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
