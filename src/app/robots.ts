import type { MetadataRoute } from 'next';

export const SITE_URL = 'https://openport.ehlabs.xyz';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                // Settings is a personal configuration screen with no content
                // worth indexing, and nothing there is reachable to a crawler
                // anyway since it renders from localStorage.
                disallow: ['/settings'],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
