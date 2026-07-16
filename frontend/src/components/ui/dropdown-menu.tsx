"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"

function DropdownMenuRoot({ ...props }: Menu.Root.Props) {
  return <Menu.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  className,
  ...props
}: Menu.Trigger.Props) {
  return (
    <Menu.Trigger
      data-slot="dropdown-menu-trigger"
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1.5 text-[#8e909a] hover:bg-[#222222] hover:text-[#e3e2e7] transition-colors",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  ...props
}: Menu.Popup.Props) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={4} align="end">
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 min-w-[160px] rounded-lg border border-[#333333] bg-[#111111] p-1 shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: Menu.Item.Props) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm text-[#e3e2e7] outline-none transition-colors data-[highlighted]:bg-[#222222] data-[highlighted]:text-[#adc6ff]",
        className
      )}
      {...props}
    />
  )
}

export { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem }
