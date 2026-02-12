import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useServices } from '@/hooks/useServices';
import { useBusiness } from '@/hooks/useBusiness';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface BlockSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialTime?: string;
  defaultServiceId?: string;
}

export function BlockSlotDialog({
  open,
  onOpenChange,
  initialDate,
  initialTime,
  defaultServiceId,
}: BlockSlotDialogProps) {
  const queryClient = useQueryClient();
  const { business } = useBusiness();
  const { services } = useServices();
  const [selectedServiceId, setSelectedServiceId] = useState<string>(defaultServiceId || '');
  const [date, setDate] = useState<Date>(initialDate || new Date());

  useEffect(() => {
    if (open) {
      setSelectedServiceId(defaultServiceId || '');
      setDate(initialDate || new Date());
      setTime(initialTime || '14:00');
    }
  }, [open, defaultServiceId, initialDate, initialTime]);
  const [time, setTime] = useState<string>(initialTime || '14:00');
  const [isBlocking, setIsBlocking] = useState(false);

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    const t = `${hours.toString().padStart(2, '0')}:${minutes}`;
    const label = new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { value: t, label };
  });

  const handleBlock = async () => {
    if (!business?.id || !selectedServiceId) {
      toast.error('Please select a service');
      return;
    }
    setIsBlocking(true);
    try {
      const { error } = await supabase.from('slot_blocks').insert({
        business_id: business.id,
        service_id: selectedServiceId,
        blocked_date: format(date, 'yyyy-MM-dd'),
        start_time: time,
      });
      if (error) throw error;
      toast.success('Time slot blocked. It will no longer be available for booking.');
      queryClient.invalidateQueries({ queryKey: ['slot-blocks'] });
      onOpenChange(false);
      setSelectedServiceId('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to block slot');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedServiceId(defaultServiceId || '');
      setDate(initialDate || new Date());
      setTime(initialTime || '14:00');
    }
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Block Time Slot</AlertDialogTitle>
          <AlertDialogDescription>
            Block a specific time slot so it won't be available for customers to book (e.g. cancel a class at 2 PM).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                {services
                  .filter(s => s.status === 'active')
                  .map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <input
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={format(date, 'yyyy-MM-dd')}
              onChange={e => setDate(new Date(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Time</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBlocking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault();
              handleBlock();
            }}
            disabled={isBlocking || !selectedServiceId}
          >
            {isBlocking ? 'Blocking...' : 'Block Slot'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
