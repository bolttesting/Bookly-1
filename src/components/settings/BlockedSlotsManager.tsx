import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Ban, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/hooks/useBusiness';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BlockSlotDialog } from '@/components/services/BlockSlotDialog';
import { useState } from 'react';

interface SlotBlock {
  id: string;
  service_id: string;
  blocked_date: string;
  start_time: string;
  services?: { name: string } | null;
}

export function BlockedSlotsManager() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['slot-blocks', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('slot_blocks')
        .select('id, service_id, blocked_date, start_time, services(name)')
        .eq('business_id', business.id)
        .gte('blocked_date', format(new Date(), 'yyyy-MM-dd'))
        .order('blocked_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data || []) as SlotBlock[];
    },
    enabled: !!business?.id,
  });

  const deleteBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('slot_blocks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slot-blocks'] });
      toast.success('Slot unblocked');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to unblock'),
  });

  const formatTime = (t: string) => {
    const s = typeof t === 'string' ? t.slice(0, 5) : '00:00';
    const [h, m] = s.split(':').map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Blocked time slots that won't be available for booking
        </p>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Block Slot
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-secondary rounded" />
          ))}
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-dashed">
          No blocked slots
        </p>
      ) : (
        <ul className="space-y-2">
          {blocks.map(b => (
            <li
              key={b.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-secondary/30"
            >
              <div>
                <span className="font-medium">
                  {(b.services as { name: string })?.name || 'Service'}
                </span>
                <span className="text-muted-foreground mx-2">•</span>
                <span>{format(new Date(b.blocked_date), 'EEE, MMM d, yyyy')}</span>
                <span className="text-muted-foreground mx-2">at</span>
                <span>{formatTime(b.start_time)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteBlock.mutate(b.id)}
                disabled={deleteBlock.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <BlockSlotDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
