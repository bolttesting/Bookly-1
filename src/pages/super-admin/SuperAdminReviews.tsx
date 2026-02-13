import { useState } from 'react';
import { useReviews } from '@/hooks/useReviews';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { Review } from '@/hooks/useReviews';

export default function SuperAdminReviews() {
  const { reviews, isLoading, create, update, delete: deleteReview, isCreating, isUpdating, isDeleting } = useReviews();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [displayOrder, setDisplayOrder] = useState(0);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setRole('');
    setContent('');
    setRating(5);
    setDisplayOrder(reviews.length);
  };

  const openCreate = () => {
    resetForm();
    setDisplayOrder(reviews.length);
    setDialogOpen(true);
  };

  const openEdit = (r: Review) => {
    setEditing(r);
    setName(r.name);
    setRole(r.role ?? '');
    setContent(r.content);
    setRating(r.rating);
    setDisplayOrder(r.display_order);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await update({ id: editing.id, name, role: role || null, content, rating, display_order: displayOrder });
        toast.success('Review updated');
      } else {
        await create({ name, role: role || null, content, rating, display_order: displayOrder });
        toast.success('Review added');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await deleteReview(id);
      toast.success('Review deleted');
      if (editing?.id === id) setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reviews</h1>
          <p className="text-muted-foreground">Manage testimonials shown on the home page</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Review
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Testimonials</CardTitle>
          <CardDescription>{reviews.length} reviews displayed on the landing page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No reviews yet. Add one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="max-w-[200px] truncate">Content</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.role ?? '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.content}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < r.rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{r.display_order}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)} disabled={isUpdating}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} disabled={isDeleting}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Review' : 'Add Review'}</DialogTitle>
            <DialogDescription>Review shown in the testimonials section on the home page</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-name">Name</Label>
              <Input id="review-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-role">Role</Label>
              <Input id="review-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Salon Owner" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-content">Content</Label>
              <textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-rating">Rating (1-5)</Label>
              <Input
                id="review-rating"
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value, 10) || 5)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-order">Display Order</Label>
              <Input
                id="review-order"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
