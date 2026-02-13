import { useState } from 'react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { BlogPost } from '@/hooks/useBlogPosts';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SuperAdminBlog() {
  const { posts, isLoading, create, update, delete: deletePost, isCreating, isUpdating, isDeleting } = useBlogPosts(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(false);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setImageUrl('');
    setPublished(false);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: BlogPost) => {
    setEditing(p);
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt ?? '');
    setContent(p.content);
    setImageUrl(p.image_url ?? '');
    setPublished(p.published);
    setDialogOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editing) setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) {
      toast.error('Slug is required');
      return;
    }
    try {
      if (editing) {
        await update({
          id: editing.id,
          title,
          slug: slug.trim(),
          excerpt: excerpt || null,
          content,
          image_url: imageUrl || null,
          published,
        });
        toast.success('Blog post updated');
      } else {
        await create({
          title,
          slug: slug.trim(),
          excerpt: excerpt || null,
          content,
          image_url: imageUrl || null,
          published,
        });
        toast.success('Blog post created');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    try {
      await deletePost(id);
      toast.success('Post deleted');
      if (editing?.id === id) setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Blog</h1>
          <p className="text-muted-foreground">Manage blog posts shown on the home page</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>Published posts appear in the blog section on the landing page</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No blog posts yet</p>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Post
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{p.title}</span>
                      {p.published ? (
                        <Badge variant="default" className="text-xs">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      )}
                    </div>
                    {p.excerpt && (
                      <p className="text-sm text-muted-foreground truncate mt-1">{p.excerpt}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} disabled={isUpdating}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Blog Post' : 'New Blog Post'}</DialogTitle>
            <DialogDescription>Content appears in the blog section on the landing page</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blog-title">Title</Label>
              <Input
                id="blog-title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
                placeholder="Post title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-slug">Slug (URL-friendly)</Label>
              <Input
                id="blog-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-blog-post"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-excerpt">Excerpt</Label>
              <textarea
                id="blog-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Short summary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-content">Content</Label>
              <textarea
                id="blog-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={8}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Full blog content (plain text or simple HTML)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-image">Image URL</Label>
              <Input
                id="blog-image"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="blog-published"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="blog-published">Published (visible on home page)</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
