/**
 * PluginNavEntry — navigation entry per installed plugin (T018)
 * Feature 030: Plugin Architecture
 *
 * Renders a nav button for a single plugin. Active state styling applied
 * when isActive is true. 44×44 px minimum touch target (Constitution §III).
 */

import type { PluginManifest } from '../../plugin-api/index';

export interface PluginNavEntryProps {
  plugin: PluginManifest;
  isActive: boolean;
  onSelect: () => void;
}

export function PluginNavEntry({ plugin, isActive, onSelect }: PluginNavEntryProps) {
  return (
    <button
      className={`plugin-nav-entry${isActive ? ' plugin-nav-entry--active' : ''}`}
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`Open ${plugin.name} plugin`}
      style={isActive ? { ...styles.base, ...styles.active } : styles.base}
    >
      {plugin.name}
      {plugin.origin === 'imported' && (
        <span style={styles.badge} aria-label="user-installed">↑</span>
      )}
    </button>
  );
}

const styles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: '44px',
    minHeight: '44px',
    padding: '8px 16px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#e0e0ff',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.15s, color 0.15s',
  },
  active: {
    background: 'rgba(255,255,255,0.9)',
    color: '#4a0080',
    fontWeight: '700' as const,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badge: {
    fontSize: '0.7rem',
    opacity: 0.7,
  },
};
