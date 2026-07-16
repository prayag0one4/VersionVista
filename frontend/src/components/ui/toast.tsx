"use client"

import * as React from "react"
import { Toast } from "@base-ui/react/toast"

import { cn } from "@/lib/utils"
import { XIcon, CheckCircle, AlertCircle } from "lucide-react"

let toastManager: ReturnType<typeof Toast.createToastManager> | null = null

function getToastManager() {
  if (!toastManager) {
    toastManager = Toast.createToastManager()
  }
  return toastManager
}

export function toast(message: string, type: "success" | "error" = "success") {
  const manager = getToastManager()
  manager.add({ title: message, type, timeout: 4000 })
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const manager = getToastManager()
  return (
    <Toast.Provider toastManager={manager as any}>
      {children}
    </Toast.Provider>
  )
}

function Toaster() {
  const { toasts } = Toast.useToastManager()

  return (
    <Toast.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 w-full max-w-sm outline-none"
      )}
    >
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          toast={t}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center gap-3 rounded-lg border p-4 shadow-lg transition-all data-[state=open]:animate-in data-[state=open]:slide-in-from-right-full data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full",
            t.type === "error"
              ? "border-red-500/30 bg-red-950/80 text-red-200"
              : "border-[#4edea3]/30 bg-[#0a1a14] text-[#4edea3]"
          )}
        >
          {t.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-[#4edea3]" />
          )}
          <Toast.Title className="text-sm font-medium flex-1">
            {t.title}
          </Toast.Title>
          <Toast.Close
            className="rounded-md p-0.5 text-current opacity-50 hover:opacity-100 transition-opacity"
            render={<button />}
          >
            <XIcon className="w-3.5 h-3.5" />
          </Toast.Close>
        </Toast.Root>
      ))}
    </Toast.Viewport>
  )
}

export { ToastProvider, Toaster }
