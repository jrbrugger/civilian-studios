import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/** Brushed steel. The tokens come from the `metallic` registry item. */
const metallicButtonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-(--metallic-edge) font-medium whitespace-nowrap select-none",
    "bg-(image:--metallic-steel) text-(--metallic-ink) shadow-[shadow:var(--metallic-shadow)] [text-shadow:var(--metallic-engrave)]",
    "transition-[filter,box-shadow,translate] duration-150 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none",
    "outline-none hover:brightness-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
    // Pressed: the plate sinks 1px and the top bevel turns into a shadow.
    "active:translate-y-px active:brightness-95 active:shadow-[shadow:var(--metallic-shadow-pressed)]",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText] forced-colors:border-[ButtonText]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-sm",
        lg: "h-10 px-6 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: { size: "default" },
  }
)

function MetallicButton({
  className,
  size,
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof metallicButtonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="metallic-button"
      // A bare <button> inside a form submits it; make that opt-in.
      {...(asChild ? {} : { type: type ?? "button" })}
      className={cn(metallicButtonVariants({ size }), className)}
      {...props}
    />
  )
}

export { MetallicButton, metallicButtonVariants }
