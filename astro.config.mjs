// @ts-check
import { defineConfig } from 'astro/config';

// Domaine final (branché en Phase 5) : sert aux URLs canoniques et au sitemap.
export default defineConfig({
  site: 'https://verroptic.com',
  output: 'static',
  image: {
    // Images du Storage Supabase, optimisées au build.
    domains: ['qvjjoaczpcfddkglkhoa.supabase.co'],
  },
});
