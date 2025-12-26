import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests';
import { Calendar, Clock, User, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function RescheduleRequestsPanel() {
  const { pendingRequests, approveRequest, rejectRequest } = useRescheduleRequests();
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);

  if (pendingRequests.length === 0) {
    return null;
  }

  const handleApprove = async (request: any) => {
    setApprovingRequestId(request.id);
    try {
      await approveRequest.mutateAsync({
        requestId: request.id,
        appointmentId: request.appointment_id,
        newStartTime: request.new_start_time,
        newEndTime: request.new_end_time,
      });
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setApprovingRequestId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setRejectingRequestId(requestId);
    try {
      await rejectRequest.mutateAsync({
        requestId,
        rejectionReason: rejectionReason || undefined,
      });
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setRejectingRequestId(null);
    }
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Reschedule Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequests.map((request) => {
          const appointment = (request as any).appointment;
          const oldStart = new Date(request.old_start_time);
          const newStart = new Date(request.new_start_time);

          return (
            <Card key={request.id} className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                          Pending Review
                        </Badge>
                        {appointment?.customer && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appointment.customer.name}
                          </span>
                        )}
                      </div>
                      {appointment?.service && (
                        <p className="font-medium">{appointment.service.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-muted rounded-md">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Time</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm font-medium">
                          {format(oldStart, 'MMM d, yyyy')} at {format(oldStart, 'h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Requested Time</p>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {format(newStart, 'MMM d, yyyy')} at {format(newStart, 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(request)}
                      disabled={approvingRequestId === request.id || rejectRequest.isPending}
                    >
                      {approvingRequestId === request.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </>
                      )}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          disabled={rejectingRequestId === request.id || approveRequest.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Reject Reschedule Request</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to reject this reschedule request? You can optionally provide a reason.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
                            <Textarea
                              id="rejection-reason"
                              placeholder="Let the customer know why this time doesn't work..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setRejectionReason('')}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleReject(request.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reject Request
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}

