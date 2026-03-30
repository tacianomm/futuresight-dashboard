'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { CONFIG } from '@/lib/config';
import { fetchAllGoogleTasks } from '@/lib/googleTasks';

const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 min (tokens expire in 60 min)

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: (opts?: { prompt?: string }) => void;
          };
        };
      };
    };
    __gisLoaded?: () => void;
  }
}

export function useGoogleAuth() {
  const tokenClientRef = useRef<ReturnType<typeof window.google.accounts.oauth2.initTokenClient> | null>(null);
  const silentRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { auth, setAuth, setGoogleTasks, setSyncStatus, db, signOut } = useDashboard(
    useShallow((s) => ({
      auth:           s.auth,
      setAuth:        s.setAuth,
      setGoogleTasks: s.setGoogleTasks,
      setSyncStatus:  s.setSyncStatus,
      db:             s.db,
      signOut:        s.signOut,
    }))
  );

  // ── Token validity check ──────────────────────────────────────────────────

  const getValidToken = useCallback((): string | null => {
    if (!auth.token) return null;
    if (auth.tokenExpiry && Date.now() > auth.tokenExpiry) return null;
    return auth.token;
  }, [auth.token, auth.tokenExpiry]);

  // ── Handle successful token response ──────────────────────────────────────

  const onTokenReceived = useCallback(
    (token: string, email?: string, avatar?: string) => {
      setAuth({
        isAuthenticated: true,
        token,
        tokenExpiry:     Date.now() + TOKEN_LIFETIME_MS,
        userEmail:       email ?? auth.userEmail,
        userAvatar:      avatar ?? auth.userAvatar,
      });
      setSyncStatus('ok', 'Connected — click Sync to refresh');
    },
    [setAuth, setSyncStatus, auth.userEmail, auth.userAvatar]
  );

  // ── Initialise GIS token client ───────────────────────────────────────────

  const initTokenClient = useCallback(() => {
    if (!window.google?.accounts?.oauth2) return;
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.clientId,
      scope: 'https://www.googleapis.com/auth/tasks',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          console.warn('[Auth] token callback error:', resp.error);
          setSyncStatus('warn', 'Auth failed — click Sync to retry');
          return;
        }
        onTokenReceived(resp.access_token);
      },
    });
  }, [onTokenReceived, setSyncStatus]);

  // ── Mount: register GIS ready callback ───────────────────────────────────

  useEffect(() => {
    // If GIS is already loaded, init immediately
    if (window.google?.accounts?.oauth2) {
      initTokenClient();
      attemptSilentRefresh();
    } else {
      // Register callback for when the <script> fires onload
      window.__gisLoaded = () => {
        initTokenClient();
        attemptSilentRefresh();
      };
      // Fallback timeout: if GIS never calls back in 7s, show reconnect UI
      silentRefreshTimerRef.current = setTimeout(() => {
        if (!auth.isAuthenticated) {
          setSyncStatus('off', 'Click Sync to connect Google Tasks');
        }
      }, 7000);
    }

    return () => {
      if (silentRefreshTimerRef.current) clearTimeout(silentRefreshTimerRef.current);
      window.__gisLoaded = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Silent refresh: try to reuse stored token or silently re-auth ─────────

  function attemptSilentRefresh() {
    const token = getValidToken();
    if (token) {
      // Token still valid — mark as authenticated
      setAuth({ isAuthenticated: true });
      setSyncStatus('ok', 'Connected — click Sync to refresh');
    } else if (tokenClientRef.current) {
      // Try silent re-auth (no user interaction)
      setSyncStatus('off', 'Checking session…');
      tokenClientRef.current.requestAccessToken({ prompt: 'none' });
      // Timeout: if prompt:'none' never responds (e.g. user not yet signed in)
      setTimeout(() => {
        if (!useDashboard.getState().auth.isAuthenticated) {
          setSyncStatus('off', 'Click Sync to connect Google Tasks');
        }
      }, 5000);
    } else {
      setSyncStatus('off', 'Click Sync to connect Google Tasks');
    }
  }

  // ── Manual auth click (Connect / Sync button) ─────────────────────────────

  const handleAuthClick = useCallback(() => {
    if (!tokenClientRef.current) {
      setSyncStatus('warn', 'Google auth not loaded yet — please wait');
      return;
    }
    tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
  }, [setSyncStatus]);

  // ── Full sync with Google Tasks ───────────────────────────────────────────

  const syncWithGoogle = useCallback(async () => {
    const token = getValidToken();
    if (!token) {
      setAuth({ isAuthenticated: false });
      setSyncStatus('warn', 'Session expired — click Sync to reconnect');
      handleAuthClick();
      return;
    }

    setSyncStatus('syncing', 'Syncing…');

    try {
      const taskSource = db.tasks ?? [];
      const { map, report } = await fetchAllGoogleTasks(token, taskSource);

      setGoogleTasks(map);
      setSyncStatus(
        'ok',
        `Synced ${Object.keys(map).length} tasks · ${new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      );

      useDashboard.getState().setSyncReport(report as Record<string, unknown>);
    } catch (err: unknown) {
      if (err instanceof Error && (err as Error & { status?: number }).status === 401) {
        setAuth({ isAuthenticated: false, token: null, tokenExpiry: null });
        setSyncStatus('warn', 'Session expired — click Sync to reconnect');
      } else {
        setSyncStatus('warn', 'Sync failed — check console');
        console.error('[Sync]', err);
      }
    }
  }, [getValidToken, setAuth, setSyncStatus, handleAuthClick, setGoogleTasks, db.tasks]);

  // ── Sync button action ────────────────────────────────────────────────────

  const onSyncClick = useCallback(() => {
    if (auth.isAuthenticated) {
      syncWithGoogle();
    } else {
      handleAuthClick();
    }
  }, [auth.isAuthenticated, syncWithGoogle, handleAuthClick]);

  // ── Sign out ──────────────────────────────────────────────────────────────

  const handleSignOut = useCallback(() => {
    signOut();
    tokenClientRef.current = null;
  }, [signOut]);

  return {
    getValidToken,
    onSyncClick,
    handleSignOut,
    isAuthenticated: auth.isAuthenticated,
    syncStatus:      useDashboard((s) => s.syncStatus),
    syncMessage:     useDashboard((s) => s.syncMessage),
  };
}
