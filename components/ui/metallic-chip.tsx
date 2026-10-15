"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { ChipGroup, ChipGroupItem } from "@/components/ui/chip-group"
import { ChipList, type ChipListProps } from "@/components/ui/chip-list"

/** Brushed steel for a chip that is on. The tokens and the sheen keyframes come from the `metallic` registry item. */
const STEEL = [
  "relative overflow-hidden",
  "data-[state=on]:border-(--metallic-edge) data-[state=on]:bg-(image:--metallic-steel) data-[state=on]:text-(--metallic-ink)",
  "data-[state=on]:shadow-[shadow:var(--metallic-shadow)] data-[state=on]:[text-shadow:var(--metallic-engrave)]",
  // One light sweep each time the chip turns on.
  "after:pointer-events-none after:absolute after:inset-0 after:bg-(image:--metallic-sheen) after:content-[''] after:opacity-0",
  "data-[state=on]:motion-safe:after:animate-[metallic-sheen_700ms_cubic-bezier(.3,.6,.2,1)_40ms]",
  // Machined parts: touching corners go square.
  "data-[corner-tl]:rounded-tl-none data-[corner-tr]:rounded-tr-none data-[corner-bl]:rounded-bl-none data-[corner-br]:rounded-br-none",
  "forced-colors:data-[state=on]:bg-[Highlight] forced-colors:data-[state=on]:text-[HighlightText]",
].join(" ")

function MetallicChipGroup({ className, ...props }: React.ComponentProps<typeof ChipGroup>) {
  // Joined chips overlap by 1px so they share one border (the seam), and snap with a small overshoot.
  return <ChipGroup className={cn("[--chip-seam:-1px] [--chip-ease:cubic-bezier(.34,1.25,.64,1)]", className)} {...props} />
}

function MetallicChipGroupItem({ className, ...props }: React.ComponentProps<typeof ChipGroupItem>) {
  return <ChipGroupItem className={cn(STEEL, className)} {...props} />
}

const LIST_STEEL = [
  "relative overflow-hidden border-(--metallic-edge) bg-(image:--metallic-steel) text-(--metallic-ink)",
  "shadow-[shadow:var(--metallic-shadow)] [text-shadow:var(--metallic-engrave)]",
  "forced-colors:bg-[ButtonFace] forced-colors:text-[ButtonText]",
].join(" ")

function MetallicChipList({ itemClassName, ...props }: ChipListProps) {
  return <ChipList itemClassName={cn(LIST_STEEL, itemClassName)} {...props} />
}

export { MetallicChipGroup, MetallicChipGroupItem, MetallicChipList }
