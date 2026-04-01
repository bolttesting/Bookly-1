import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useBlogPostBySlug } from '@/hooks/useBlogPostBySlug';
import { useSeo } from '@/hooks/useSeo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, Calendar, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { SITE_ORIGIN } from '@/lib/site';
import { injectJsonLd, removeJsonLd } from '@/lib/seo';

function blogOgImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http')) return url;
  return `${SITE_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, isLoading } = useBlogPostBySlug(slug);

  const notFound = !isLoading && !post;
  const seoTitle =
    post?.meta_title?.trim() ||
    post?.title ||
    (isLoading ? 'Blog post' : notFound ? 'Post not found' : 'Blog');
  const seoDescription =
    post?.meta_description?.trim() ||
    post?.excerpt ||
    post?.title ||
    'Articles about booking, scheduling, and running a service business with Bookly.';

  useSeo({
    title: seoTitle,
    description: seoDescription,
    path: `/blog/${slug ?? ''}`,
    ogType: 'article',
    ogImage: blogOgImage(post?.image_url ?? undefined),
    noindex: notFound,
  });

  useEffect(() => {
    if (!post || !slug) {
      removeJsonLd('bookly-blog-jsonld');
      return;
    }
    const img = blogOgImage(post.image_url);
    const schemaDescription =
      post.meta_description?.trim() || post.excerpt || undefined;
    injectJsonLd('bookly-blog-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.meta_title?.trim() || post.title,
      ...(schemaDescription ? { description: schemaDescription } : {}),
      datePublished: post.created_at,
      ...(img ? { image: [img] } : {}),
      author: { '@type': 'Organization', name: 'Bookly' },
      publisher: {
        '@type': 'Organization',
        name: 'Bookly',
        logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/favicon.svg` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_ORIGIN}/blog/${slug}` },
    });
    return () => removeJsonLd('bookly-blog-jsonld');
  }, [post, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Post not found</h1>
          <p className="text-muted-foreground mb-4">This blog post may have been removed or doesn't exist.</p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <article className="container mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <FileText className="h-4 w-4" />
          <span>Blog</span>
          <span>·</span>
          <time className="flex items-center gap-1" dateTime={post.created_at}>
            <Calendar className="h-4 w-4" />
            {format(new Date(post.created_at), 'MMMM d, yyyy')}
          </time>
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-bold mb-6">{post.title}</h1>

        {post.image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8 bg-muted">
            <img
              src={post.image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {post.excerpt && (
          <p className="text-xl text-muted-foreground mb-8">{post.excerpt}</p>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-display prose-headings:font-bold
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}
