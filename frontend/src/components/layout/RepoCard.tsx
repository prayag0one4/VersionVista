"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { EllipsisVertical, Trash2, RefreshCw, Loader2 } from "lucide-react"
import { api, Repository } from "@/lib/api"
import { useUIStore } from "@/store/uiStore"
import { toast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface RepoCardProps {
  repo: Repository
}

export function RepoCard({ repo }: RepoCardProps) {
  const selectRepo = useUIStore((s) => s.selectRepo)
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<{ type: "delete" | "refetch" } | null>(null)
  const [commitCount, setCommitCount] = useState(20)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/repo/${repo._id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] })
      queryClient.invalidateQueries({ queryKey: ["commits"] })
      toast("Repository deleted successfully", "success")
    },
    onError: () => {
      toast("Failed to delete repository", "error")
    },
  })

  const refetchMutation = useMutation({
    mutationFn: async () => {
      await api.post("/repo/fetch", { repoUrl: repo.githubUrl, commitCount })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repos"] })
      queryClient.invalidateQueries({ queryKey: ["commits"] })
      toast("Repository refetched successfully", "success")
    },
    onError: () => {
      toast("Failed to refetch repository", "error")
    },
  })

  const handleConfirm = () => {
    if (dialog?.type === "delete") deleteMutation.mutate()
    if (dialog?.type === "refetch") refetchMutation.mutate()
    setDialog(null)
  }

  const isPending = deleteMutation.isPending || refetchMutation.isPending

  return (
    <>
      <div className="group relative">
        <button
          onClick={() => selectRepo(repo._id)}
          className="flex flex-col items-start rounded-xl border border-[#333333] bg-[#111111]/60 backdrop-blur-md p-6 transition-all hover:border-[#adc6ff]/50 hover:bg-[#1a1a1a] text-left shadow-lg w-full"
        >
          <h2 className="text-lg font-semibold text-[#e3e2e7]">{repo.name}</h2>
          <p className="mt-2 text-sm text-[#8e909a] truncate w-full font-mono" title={repo.githubUrl}>
            {repo.githubUrl}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#c0c1ff]">
            <span className="rounded bg-[#333333]/40 border border-[#333333] px-2 py-1">
              {repo.defaultBranch}
            </span>
            <span className="text-[#8e909a]">{repo.owner}</span>
          </div>
        </button>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenuRoot open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger>
              <EllipsisVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false)
                  setDialog({ type: "refetch" })
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Refetch Repository
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false)
                  setDialog({ type: "delete" })
                }}
                className="text-red-400 data-[highlighted]:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                Delete Repository
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={() => !isPending && setDialog(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "delete" ? "Delete Repository" : "Refetch Repository"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === "delete"
                ? "Click Confirm to delete this repository and all its associated data."
                : "Click Confirm to refetch this repository and update its data."}
            </DialogDescription>
          </DialogHeader>
          {dialog?.type === "refetch" && (
            <div className="grid gap-2">
              <Label htmlFor="refetch-commitCount" className="text-sm text-[#e3e2e7]">
                Commits to analyze
              </Label>
              <Input
                id="refetch-commitCount"
                type="number"
                min={1}
                max={100}
                value={commitCount}
                onChange={(e) => setCommitCount(Math.max(1, Math.min(100, Number(e.target.value) || 20)))}
                className="bg-[#0a0a0a] border-[#333333] text-[#e3e2e7] placeholder:text-[#8e909a]"
                disabled={isPending}
              />
            </div>
          )}
          <DialogFooter>
            <button
              onClick={() => setDialog(null)}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md border border-[#333333] bg-transparent px-4 py-2 text-sm font-medium text-[#e3e2e7] hover:bg-[#222222] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
                dialog?.type === "delete"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-[#adc6ff] text-black hover:bg-[#8ba8f0]",
              ].join(" ")}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
