'use client';
import { useState, useCallback } from 'react';

interface ImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  loading?: 'lazy' | 'eager';
  fallbackText?: string;
  fallbackIcon?: string;
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  loading = 'lazy',
  fallbackText = 'NO DATA',
  fallbackIcon = '◆',
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1a0a0a] via-[#1a1015] to-[#0a0a1a] ${fallbackClassName || className}`}
      >
        <div className="text-center">
          <div className="text-[#E4002B]/20 text-2xl mb-1">{fallbackIcon}</div>
          <span className="text-[#333333] text-[8px] tracking-[0.3em]">
            {fallbackText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div
          className={`absolute inset-0 bg-[#0d0d0d] animate-pulse ${className}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}
