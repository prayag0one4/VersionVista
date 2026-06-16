import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';

export function AddRepoDialog() {
  const [open, setOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const queryClient = useQueryClient();

  const addRepoMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await api.post('/repo/fetch', { repoUrl: url });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] });
      setOpen(false);
      setRepoUrl('');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || error.message || 'Failed to add repository');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      addRepoMutation.mutate(repoUrl.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
        <Plus className="w-4 h-4" />
        Add Repository
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle>Add New Repository</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the clone URL of the git repository. This might take a few moments to clone and process the commit history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="url" className="text-zinc-300">
                Repository URL
              </Label>
              <Input
                id="url"
                placeholder="https://github.com/user/repo.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
                disabled={addRepoMutation.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!repoUrl.trim() || addRepoMutation.isPending}
              className="w-full sm:w-auto gap-2"
            >
              {addRepoMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {addRepoMutation.isPending ? 'Processing...' : 'Add Repository'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
