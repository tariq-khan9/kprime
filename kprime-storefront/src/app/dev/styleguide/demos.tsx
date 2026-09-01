"use client"

import { useState } from "react"

import { Accordion } from "@/components/ui/Accordion"
import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"
import { Drawer, type DrawerSide } from "@/components/ui/Drawer"
import { Modal } from "@/components/ui/Modal"
import { RadioGroup } from "@/components/ui/RadioGroup"
import { ToastProvider, useToast } from "@/components/ui/Toast"

/**
 * The styleguide demos that need state. Everything static stays inline in
 * page.tsx so the page itself remains a server component.
 */

export function CheckboxDemo() {
  const [checked, setChecked] = useState<boolean | "indeterminate">(false)

  return (
    <div className="flex max-w-sm flex-col gap-1">
      <Checkbox
        label="Interactive — click me"
        checked={checked}
        onCheckedChange={setChecked}
        count={12}
      />
      <Checkbox label="Unchecked" defaultChecked={false} />
      <Checkbox label="Checked" defaultChecked />
      <Checkbox label="Indeterminate" checked="indeterminate" />
      <Checkbox label="Disabled" disabled />
      <Checkbox label="Disabled + checked" checked disabled />
    </div>
  )
}

export function RadioGroupDemo() {
  const [value, setValue] = useState("standard")

  return (
    <div className="max-w-sm">
      <RadioGroup
        label="Delivery method"
        value={value}
        onValueChange={setValue}
        options={[
          {
            value: "standard",
            label: "Standard Delivery (3–5 days)",
            description: "Rs 250",
          },
          {
            value: "express",
            label: "Express Delivery (2–3 days)",
            description: "Rs 600",
          },
          {
            value: "pickup",
            label: "Store pickup",
            description: "Not available in your area",
            disabled: true,
          },
        ]}
      />
      <p className="mt-2 text-muted">
        Selected: {value} — arrow keys move the selection.
      </p>
    </div>
  )
}

export function DrawerDemo() {
  const [side, setSide] = useState<DrawerSide | null>(null)

  return (
    <div className="flex flex-wrap gap-3">
      {(["left", "right", "bottom"] as DrawerSide[]).map((s) => (
        <Button key={s} variant="secondary" onClick={() => setSide(s)}>
          Open {s}
        </Button>
      ))}

      <Drawer
        open={side !== null}
        onOpenChange={(open) => !open && setSide(null)}
        side={side ?? "right"}
        title={`${side ?? ""} drawer`}
        description="Escape closes. The page behind should not scroll."
        footer={<Button className="w-full">Footer action</Button>}
      >
        <div className="flex flex-col gap-3">
          <p>Tab through these — focus stays inside the panel.</p>
          <Button variant="secondary">First</Button>
          <Button variant="secondary">Second</Button>
          <p className="text-muted">
            On close, focus returns to the button that opened this.
          </p>
        </div>
      </Drawer>
    </div>
  )
}

export function ModalDemo() {
  const [open, setOpen] = useState(false)

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Remove this item?"
      description="This cannot be undone."
      trigger={<Button variant="secondary">Open modal</Button>}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Remove</Button>
        </div>
      }
    >
      <p>Tab cycles inside this dialog only. Escape closes it.</p>
    </Modal>
  )
}

function ToastButtons() {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Added to cart",
            description: "45W USB-C Wall Charger",
            variant: "success",
          })
        }
      >
        Fire success
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            title: "Could not add to cart",
            description: "That variant just went out of stock.",
            variant: "error",
          })
        }
      >
        Fire error
      </Button>
    </div>
  )
}

export function ToastDemo() {
  return (
    <div className="flex flex-col gap-2">
      {/* Scoped here for the demo. In the real app the provider wraps the shop
          layout so any page can fire one. */}
      <ToastProvider>
        <ToastButtons />
      </ToastProvider>
      <p className="text-muted">
        Fire twice quickly — they stack. Auto-dismiss after 4s.
      </p>
    </div>
  )
}

export function AccordionDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-muted">
          single, collapsible — 3 levels deep (mobile nav goes this far)
        </p>
        <Accordion
          items={[
            {
              value: "electronics",
              trigger: "Electronics",
              content: (
                <Accordion
                  items={[
                    {
                      value: "audio",
                      trigger: "Audio",
                      content: (
                        <Accordion
                          items={[
                            {
                              value: "earbuds",
                              trigger: "Earbuds",
                              content: (
                                <p className="text-muted">
                                  Level 3 — expands correctly.
                                </p>
                              ),
                            },
                          ]}
                        />
                      ),
                    },
                    {
                      value: "mobile",
                      trigger: "Mobile Accessories",
                      content: <p className="text-muted">Level 2 leaf.</p>,
                    },
                  ]}
                />
              ),
            },
            {
              value: "cosmetics",
              trigger: "Cosmetics",
              content: <p className="text-muted">Level 1 leaf.</p>,
            },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-muted">multiple — both can be open at once</p>
        <Accordion
          type="multiple"
          items={[
            {
              value: "shipping",
              trigger: "Shipping & Returns",
              content: <p className="text-muted">Delivered in 3–5 days.</p>,
            },
            {
              value: "specs",
              trigger: "Specifications",
              content: <p className="text-muted">Wattage 45W · Colour White</p>,
            },
          ]}
        />
      </div>
    </div>
  )
}
