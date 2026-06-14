import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/school-admin/',
          '/super-admin/',
          '/teacher/',
          '/student/',
          '/parent/',
          '/api/',
          '/payments/',
        ],
      },
    ],
    sitemap: 'https://educore.com/sitemap.xml',
  }
}
