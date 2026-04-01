import { Link } from 'react-router-dom';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { useSeo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Calendar, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function BlogIndex() {
  const { posts, isLoading } = useBlogPosts(false);

  useSeo({
    title: 'Blog',
    description:
      'Articles from Bookly on online booking, scheduling, client experience, and running a service business.',
    path: '/blog',
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-12 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tips, product updates, and ideas for salons, clinics, and service businesses.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border bg-muted/20">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No articles published yet. Check back soon.</p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="glass-card rounded-xl overflow-hidden border border-border/60 hover:border-primary/30 hover-lift transition-all duration-300 flex flex-col group"
              >
                {post.image_url ? (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <FileText className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-5 sm:p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <time dateTime={post.created_at}>
                      {format(new Date(post.created_at), 'MMMM d, yyyy')}
                    </time>
                  </div>
                  <h2 className="text-lg font-display font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>
                  )}
                  <span className="text-sm font-medium text-primary mt-4 inline-flex items-center gap-1">
                    Read article →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
