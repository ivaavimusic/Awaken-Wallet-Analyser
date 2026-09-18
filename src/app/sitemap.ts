import type { MetadataRoute } from 'next';
import { SITE_URL } from './robots';

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();
    return [
        {
            url: SITE_URL,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1,
        },
        {
            url: `${SITE_URL}/tax`,
            lastModified,
            changeFrequency: 'monthly',
            priority: 0.7,
        },
    ];
}
