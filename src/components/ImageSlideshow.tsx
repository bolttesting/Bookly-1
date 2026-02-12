import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageSlideshowProps {
  imageUrls: string[] | null | undefined;
  alt: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'portrait';
}

export function ImageSlideshow({
  imageUrls,
  alt,
  className,
  aspectRatio = 'video',
}: ImageSlideshowProps) {
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());

  const urls = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];

  const aspectClass = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  const handleError = (index: number) => {
    setFailedIndexes((prev) => new Set(prev).add(index));
  };

  if (urls.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg',
          aspectClass,
          className
        )}
      >
        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
      </div>
    );
  }

  if (urls.length === 1) {
    const validUrl = urls[0] && !failedIndexes.has(0);
    return (
      <div className={cn('overflow-hidden rounded-lg', aspectClass, className)}>
        {validUrl ? (
          <img
            src={urls[0]}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => handleError(0)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
    );
  }

  return (
    <Carousel className={cn('w-full', className)} opts={{ loop: true }}>
      <CarouselContent className="-ml-0">
        {urls.map((url, index) => (
          <CarouselItem key={index} className="pl-0">
            <div className={cn('overflow-hidden rounded-lg', aspectClass)}>
              {!failedIndexes.has(index) ? (
                <img
                  src={url}
                  alt={`${alt} - image ${index + 1}`}
                  className="h-full w-full object-cover"
                  onError={() => handleError(index)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2 h-8 w-8" />
      <CarouselNext className="right-2 h-8 w-8" />
    </Carousel>
  );
}
