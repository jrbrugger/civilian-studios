/*
Radix/shadcn-derived structure; original material and geometry: Civilian Studios.
MIT License

Copyright (c) 2023 shadcn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
"use client"

import { forwardRef, useEffect, useId, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import "./slime-switch.css"

/** The four material palettes. */
export type SlimeColor = "green" | "blue" | "pink" | "purple"
/** Native Radix behavior with optional slime appearance and motion. */
export type SlimeSwitchProps = Omit<ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "asChild" | "children"> & {
  /** Full liquid silhouette or restrained material. Default: slime. */
  treatment?: "slime" | "subtle"
  /** Material palette. Default: green. */
  slimeColor?: SlimeColor
  /** Optional short visual state text. Decorative; never the accessible name. Omit by default. */
  stateText?: { checked: string; unchecked: string }
  /** Enables continuous ooze; reduced motion always takes precedence. */
  animate?: boolean
}

/** Decorative liquid field inspired by the existing chips-v2 slime prototype. */
function LiquidSurface({ id, disabled }: { id: string; disabled?: boolean }) {
  return (
    <svg className="cs-slime-liquid" viewBox="0 0 90 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor="var(--slime-light)" />
          <stop offset=".4" stopColor="var(--slime-mid)" />
          <stop offset="1" stopColor="var(--slime-dark)" />
        </linearGradient>
        <filter id={`${id}-goo`} filterUnits="userSpaceOnUse" x="0" y="8" width="90" height="96" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.65" result="field" />
          <feColorMatrix in="field" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -6" result="body" />
          {!disabled && <>
            <feSpecularLighting in="field" surfaceScale="2.2" specularConstant=".55" specularExponent="18" lightingColor="#fff" result="light">
              <feDistantLight azimuth="235" elevation="55" />
            </feSpecularLighting>
            <feComposite in="light" in2="body" operator="in" result="gloss" />
            <feMerge><feMergeNode in="body" /><feMergeNode in="gloss" /></feMerge>
          </>}
        </filter>
      </defs>
      <g filter={`url(#${id}-goo)`} fill={`url(#${id}-fill)`}>
        <path className="cs-slime-liquidBody" d="M 12 32 C 11 21 20 16 31 16 C 45 15 53 17 62 16 C 73 15 79 23 78 32 C 79 42 72 49 62 48 C 52 47 44 51 34 49 C 23 49 12 45 12 32 Z" />
        <ellipse className="cs-slime-edge cs-slime-edgeLeft" cx="14" cy="34" rx="4.5" ry="8" />
        <ellipse className="cs-slime-edge cs-slime-edgeRight" cx="76" cy="29" rx="4" ry="7" />
        <ellipse className="cs-slime-edge cs-slime-edgeTop" cx="43" cy="17" rx="12" ry="3.5" />
        <g className="cs-slime-reservoir"><g className="cs-slime-tendril cs-slime-tendrilOne">
          <path d="M 23 43 C 23 49 27 49 26 55 C 25 61 20 62 20 56 C 20 51 17 49 18 44 Z" />
          <ellipse cx="23" cy="56" rx="4" ry="4.8" />
        </g></g>
        <g className="cs-slime-reservoir"><g className="cs-slime-tendril cs-slime-tendrilTwo">
          <path d="M 41 45 C 41 53 38 54 39 61 C 40 65 44 65 44 61 C 45 55 45 51 47 45 Z" />
          <ellipse cx="41.5" cy="62" rx="3.4" ry="4.1" />
        </g></g>
        <g className="cs-slime-reservoir"><g className="cs-slime-tendril cs-slime-tendrilThree">
          <path d="M 63 43 C 63 49 59 49 61 54 C 62 59 67 57 67 53 C 67 49 70 47 70 43 Z" />
          <ellipse cx="64" cy="54" rx="4.4" ry="4.3" />
        </g></g>
        <ellipse className="cs-slime-fallingDrop" cx="41.5" cy="62" rx="3" ry="4" />
      </g>
    </svg>
  )
}

/** Liquid material retaining Radix form, keyboard, controlled/uncontrolled, and ref behavior. */
export const SlimeSwitch = forwardRef<HTMLButtonElement, SlimeSwitchProps>(function SlimeSwitch({ className, treatment = "slime", slimeColor = "green", animate = true, stateText, ...props }, forwardedRef) {
  const id = `cs-slime-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const surface = useRef<HTMLSpanElement>(null)
  const [running, setRunning] = useState(false)
  useEffect(() => {
    let visible = true
    const update = () => setRunning(visible && !document.hidden)
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    })
    if (surface.current) observer?.observe(surface.current)
    document.addEventListener("visibilitychange", update)
    update()
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update) }
  }, [])
  return (
    <SwitchPrimitive.Root {...props} ref={forwardedRef} data-slot="switch" data-treatment={treatment} data-slime-color={slimeColor} data-animate={animate && running && !props.disabled} className={cn("cs-slime-switch", className)}>
      <span ref={surface} className="cs-slime-track" aria-hidden="true">
        <LiquidSurface id={id} disabled={props.disabled} />
        {stateText && <><span className="cs-slime-markOn">{stateText.checked}</span><span className="cs-slime-markOff">{stateText.unchecked}</span></>}
      </span>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="cs-slime-thumb">
        <span className="cs-slime-blob" aria-hidden="true">
          {props.disabled ? <svg className="cs-slime-lock" viewBox="0 0 16 16" fill="none" focusable="false"><path d="M5 7V5a3 3 0 0 1 6 0v2" /><rect x="3.5" y="7" width="9" height="7" rx="2" /><path d="M8 10v1" /></svg> : <span className="cs-slime-bubble" />}
        </span>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
})

/** Labelled settings-row composition. Accessible naming comes from the visible label. */
export type SlimeSwitchFieldProps = Omit<SlimeSwitchProps, "aria-label" | "aria-labelledby"> & {
  /** Required, stable visible name for the preference. Does not change with state. */
  label: string
  /** Optional supporting text below the drip clearance, associated with aria-describedby. Omitted by default. */
  description?: ReactNode
  /** Hug label and switch together, or stretch the row to its container. Default: hugged. */
  layout?: "hugged" | "stretched"
  /** Classes for the outer settings row; className still styles the switch itself. */
  fieldClassName?: string
}

/** Preferred composition for settings: clickable label, optional description, and the Radix control. */
export const SlimeSwitchField = forwardRef<HTMLButtonElement, SlimeSwitchFieldProps>(function SlimeSwitchField({ label, description, fieldClassName, layout = "hugged", id, "aria-describedby": describedBy, ...props }, forwardedRef) {
  const generatedId = useId()
  const switchId = id ?? `slime-field-${generatedId}`
  const labelId = `${generatedId}-label`
  const descriptionId = `${generatedId}-description`
  const hasDescription = description !== undefined && description !== null && description !== "" && typeof description !== "boolean"
  const descriptionIds = [hasDescription ? descriptionId : undefined, describedBy].filter(Boolean).join(" ") || undefined
  return (
    <div dir={props.dir} data-slot="slime-switch-field" data-treatment={props.treatment ?? "slime"} data-layout={layout} data-disabled={props.disabled ? "" : undefined} className={cn("cs-slime-field", fieldClassName)}>
      <div data-slot="slime-switch-row" className="cs-slime-field-row">
        <label data-slot="slime-switch-label" id={labelId} htmlFor={switchId} className="cs-slime-field-label">{label}</label>
        <SlimeSwitch {...props} ref={forwardedRef} id={switchId} aria-labelledby={labelId} aria-describedby={descriptionIds} />
      </div>
      {hasDescription && <div data-slot="slime-switch-description" id={descriptionId} className="cs-slime-field-description">{description}</div>}
    </div>
  )
})
