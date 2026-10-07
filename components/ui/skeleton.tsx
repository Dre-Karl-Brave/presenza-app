import { cn } from "cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted", className)}
      style={{
        animation:
          "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) 0.2s infinite, skeleton-appear 1ms linear 0.2s backwards",
      }}
      {...props}
    />
  )
}

export { Skeleton }
