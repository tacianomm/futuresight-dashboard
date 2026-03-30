'use client';

import Script from 'next/script';

/**
 * Loads the Google Identity Services script as a client component
 * so we can use the onLoad callback (which is not allowed in Server Components).
 *
 * When the script finishes loading it calls window.__gisLoaded() if set,
 * which is registered by useGoogleAuth to initialise the token client.
 */
export default function GoogleScript() {
  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={() => {
        if (typeof window !== 'undefined' && typeof window.__gisLoaded === 'function') {
          window.__gisLoaded();
        }
      }}
    />
  );
}
