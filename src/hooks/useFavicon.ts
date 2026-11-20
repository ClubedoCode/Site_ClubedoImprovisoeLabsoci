import { useEffect } from 'react';

const TIPOS: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export function useFavicon(href: string) {
  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    const extensao = href.split('.').pop()?.toLowerCase() ?? '';
    link.type = TIPOS[extensao] ?? '';
    link.href = href;
  }, [href]);
}