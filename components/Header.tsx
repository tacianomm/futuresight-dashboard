'use client';

import { useDashboard } from '@/store/dashboard';
import { useShallow } from 'zustand/react/shallow';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

export default function Header() {
  const { auth, syncMessage, syncStatus, otterBadge } = useDashboard(
    useShallow((s) => ({
      auth:        s.auth,
      syncMessage: s.syncMessage,
      syncStatus:  s.syncStatus,
      otterBadge:  s.otterBadge,
    }))
  );

  const { onSyncClick, handleSignOut } = useGoogleAuth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });

  return (
    <>
      {/* Setup banner — shown when not authenticated */}
      {!auth.isAuthenticated && (
        <div className="setup-banner">
          <p>
            <strong>Connect Google Tasks</strong> to sync your task completion state across devices.
            Click <strong>Sync</strong> to authenticate.
          </p>
          <button className="connect-btn" onClick={onSyncClick}>
            Connect Google Tasks
          </button>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <div className="logo">
            Future<span>Sight</span>
          </div>
          <div className="header-sub">Product Lead · Venture Dashboard</div>
        </div>

        <div className="header-right">
          {/* Otter badge */}
          <div className={`otter-sync-badge ${otterBadge.count > 0 ? 'loaded' : ''}`}>
            <span className="otter-dot" />
            <span>🦦 Otter</span>
            {otterBadge.count > 0 && (
              <span className="otter-label">
                {otterBadge.count} tasks{otterBadge.latestDate ? ` · ${otterBadge.latestDate}` : ''}
              </span>
            )}
          </div>

          {/* Date */}
          <div className="date-badge">{today}</div>

          {/* Sync area */}
          <div className="sync-area">
            <span className="sync-dot" style={{
              background: syncStatus === 'ok' ? '#22c55e' : syncStatus === 'warn' ? '#f59e0b' : '#475569',
            }} />
            <button
              className="sync-btn"
              onClick={onSyncClick}
              disabled={syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' ? (
                <span className="spin">⟳</span>
              ) : (
                <span>⟳</span>
              )}
              {syncStatus === 'syncing' ? 'Syncing…' : 'Sync'}
            </button>
            <span className="sync-time">{syncMessage}</span>
          </div>

          {/* User chip */}
          {auth.isAuthenticated && (
            <>
              <div className="user-chip">
                {auth.userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={auth.userAvatar} alt="avatar" />
                ) : (
                  <span style={{ fontSize: 16 }}>👤</span>
                )}
                <span>{auth.userEmail ?? 'Connected'}</span>
              </div>
              <button className="signout-btn" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
    </>
  );
}
