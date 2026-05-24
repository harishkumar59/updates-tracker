import React, { useState } from 'react';
import {
  Card,
  Button,
  Spin,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Space,
  Badge,
  Select,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ThunderboltOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { fetchSiteValue } from '../utils/fetcher';

const { Text, Link, Paragraph } = Typography;

// ─── Interval options ────────────────────────────────────────────────────────
const INTERVAL_OPTIONS = [
  { value: 0,  label: '⏸ Off (manual)' },
  { value: 5,  label: '⚡ Every 5 min'  },
  { value: 15, label: '⚡ Every 15 min' },
  { value: 30, label: '⚡ Every 30 min' },
  { value: 60, label: '⚡ Every 1 hour' },
];

/**
 * SiteCard – displays one tracked site.
 *
 * Props:
 *  - site            {object}  Tracked-site data object.
 *  - onUpdate        {fn}      (id, patch) => void  — called after fetch.
 *  - onDelete        {fn}      (id) => void
 *  - onSetInterval   {fn}      (id, minutes) => void — saves auto-refresh setting.
 *  - onDismissChange {fn}      (id) => void — clears the CHANGED badge.
 */
export default function SiteCard({ site, onUpdate, onDelete, onSetInterval, onDismissChange }) {
  const {
    id,
    siteName,
    targetUrl,
    cssSelector,
    lastKnownValue,
    lastUpdatedTimestamp,
    autoRefreshInterval = 0,
    hasChanged = false,
  } = site;

  // Per-card local state
  const [loading, setLoading] = useState(false);
  const [error,   setError  ] = useState(null);

  // ─── Manual Refresh ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const newValue = await fetchSiteValue(targetUrl, cssSelector);
      const changed  = newValue !== lastKnownValue;
      onUpdate(id, {
        lastKnownValue:       newValue,
        lastUpdatedTimestamp: new Date().toISOString(),
        hasChanged:           changed,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const formattedTime = lastUpdatedTimestamp
    ? new Date(lastUpdatedTimestamp).toLocaleString()
    : 'Never fetched';

  const hasValue = lastKnownValue && !lastKnownValue.startsWith('Error:');
  const isAutoOn = autoRefreshInterval > 0;

  return (
    <Spin spinning={loading} description="Fetching…">
      <Card
        className={`site-card ${hasChanged ? 'site-card--changed' : ''}`}
        variant="borderless"
        title={
          <Space>
            <Badge
              status={hasValue ? 'success' : error ? 'error' : 'default'}
              dot
            />
            <Text strong style={{ fontSize: 16, color: '#e2e8f0' }}>
              {siteName}
            </Text>
            {/* ── Auto-refresh running indicator ──────────────────────── */}
            {isAutoOn && (
              <Tooltip title={`Auto-refreshing every ${autoRefreshInterval} min`}>
                <Tag color="purple" icon={<ThunderboltOutlined />} className="auto-tag">
                  AUTO
                </Tag>
              </Tooltip>
            )}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="Refresh now">
              <Button
                type="primary"
                shape="circle"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                className="refresh-btn"
              />
            </Tooltip>
            <Popconfirm
              title="Remove this tracker?"
              description="This will permanently remove this site from your list."
              onConfirm={() => onDelete(id)}
              okText="Yes, remove"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Remove tracker">
                <Button
                  danger
                  shape="circle"
                  icon={<DeleteOutlined />}
                  className="delete-btn"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        }
      >
        {/* ── CHANGED badge ───────────────────────────────────────────────── */}
        {hasChanged && (
          <div className="changed-banner">
            <span className="changed-pulse-dot" />
            <Text className="changed-text">✦ Value changed!</Text>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              className="dismiss-btn"
              onClick={() => onDismissChange(id)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* ── URL ─────────────────────────────────────────────────────────── */}
        <div className="card-field">
          <LinkOutlined className="field-icon" />
          <Link href={targetUrl} target="_blank" rel="noopener noreferrer" ellipsis>
            {targetUrl}
          </Link>
        </div>

        {/* ── CSS Selector ────────────────────────────────────────────────── */}
        <div className="card-field">
          <CodeOutlined className="field-icon" />
          <Tag color="geekblue" style={{ fontFamily: 'monospace' }}>
            {cssSelector}
          </Tag>
        </div>

        {/* ── Tracked Value ───────────────────────────────────────────────── */}
        <div className="tracked-value-box">
          {error ? (
            <Space>
              <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
              <Text type="danger" style={{ fontSize: 13 }}>{error}</Text>
            </Space>
          ) : lastKnownValue ? (
            <Space align="start">
              <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
              <Paragraph
                className="tracked-value-text"
                ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                copyable={{ tooltips: ['Copy', 'Copied!'] }}
              >
                {lastKnownValue}
              </Paragraph>
            </Space>
          ) : (
            <Text type="secondary" style={{ fontStyle: 'italic' }}>
              No data yet — click Refresh to fetch.
            </Text>
          )}
        </div>

        {/* ── Auto-refresh interval selector ──────────────────────────────── */}
        <div className="interval-row">
          <ThunderboltOutlined className="field-icon" style={{ color: isAutoOn ? '#7c6fcd' : undefined }} />
          <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
            Auto-refresh:
          </Text>
          <Select
            size="small"
            value={autoRefreshInterval}
            options={INTERVAL_OPTIONS}
            onChange={(val) => onSetInterval(id, val)}
            className="interval-select"
            popupMatchSelectWidth={false}
          />
        </div>

        {/* ── Timestamp ───────────────────────────────────────────────────── */}
        <div className="card-footer">
          <ClockCircleOutlined style={{ marginRight: 5, opacity: 0.6 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last updated: {formattedTime}
          </Text>
        </div>
      </Card>
    </Spin>
  );
}
