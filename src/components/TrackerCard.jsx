import React, { useState, useMemo } from 'react';
import {
  Card,
  Button,
  Spin,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Space,
  Select,
  Collapse,
  Timeline,
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
  HistoryOutlined,
  BankOutlined,
  FieldTimeOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import { fetchSiteValue } from '../utils/fetcher';
import { dispatchNotifications } from '../utils/notificationService';
import { loadSettings } from '../utils/localStorage';

const { Text, Link, Paragraph } = Typography;

// ─── Interval options ────────────────────────────────────────────────────────
const INTERVAL_OPTIONS = [
  { value: 0,  label: '⏸ OFF' },
  { value: 5,  label: '⚡ 5 minutes' },
  { value: 15, label: '⚡ 15 minutes' },
  { value: 30, label: '⚡ 30 minutes' },
  { value: 60, label: '⚡ 1 hour' },
];

// ─── Monitor type labels ─────────────────────────────────────────────────────
const MONITOR_LABELS = {
  exam_date:    'Exam Date',
  deadline:     'Application Deadline',
  notification: 'Exam Notification',
  admit_card:   'Admit Card',
  result:       'Result',
  answer_key:   'Answer Key',
  status:       'Application Status',
  other:        'Update',
};

// ─── Category labels & colors ────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  upsc:      { label: 'UPSC',      color: '#7c6fcd' },
  ssc:       { label: 'SSC',       color: '#1890ff' },
  banking:   { label: 'Banking',   color: '#52c41a' },
  railway:   { label: 'Railway',   color: '#fa8c16' },
  defence:   { label: 'Defence',   color: '#eb2f96' },
  state_psc: { label: 'State PSC', color: '#13c2c2' },
  teaching:  { label: 'Teaching',  color: '#722ed1' },
  other:     { label: 'Other',     color: '#8c8c8c' },
};

/**
 * Format a timestamp into a relative or absolute time string.
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Format a timestamp for history display
 */
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * TrackerCard – displays one tracked government exam.
 */
export default function TrackerCard({ site, onUpdate, onDelete, onSetInterval, onDismissChange }) {
  const {
    id,
    siteName,
    targetUrl,
    cssSelector,
    lastKnownValue,
    previousValue,
    lastUpdatedTimestamp,
    lastChangedTimestamp,
    autoRefreshInterval = 0,
    hasChanged = false,
    monitorType = 'other',
    category = 'other',
    status = 'paused',
    errorMessage,
    history = [],
  } = site;

  // Per-card local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monitorLabel = MONITOR_LABELS[monitorType] || 'Update';
  const categoryConf = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;
  const isAutoOn = autoRefreshInterval > 0;
  const hasValue = lastKnownValue && !lastKnownValue.startsWith('Error:');

  // Compute next check time
  const nextCheckText = useMemo(() => {
    if (!isAutoOn || !lastUpdatedTimestamp) return null;
    const lastCheck = new Date(lastUpdatedTimestamp).getTime();
    const nextCheck = lastCheck + autoRefreshInterval * 60 * 1000;
    const diff = nextCheck - Date.now();
    if (diff <= 0) return 'Checking soon...';
    const mins = Math.ceil(diff / 60000);
    return `Next check: ${mins} min`;
  }, [isAutoOn, lastUpdatedTimestamp, autoRefreshInterval]);

  // Status config
  const statusConfig = {
    monitoring: { color: '#52c41a', text: 'Monitoring',  icon: null },
    checking:   { color: '#1890ff', text: 'Checking',    icon: <LoadingOutlined spin /> },
    error:      { color: '#f5222d', text: 'Error',       icon: <ExclamationCircleOutlined /> },
    paused:     { color: '#8c8c8c', text: 'Paused',      icon: <PauseCircleOutlined /> },
  };
  const currentStatus = loading
    ? statusConfig.checking
    : error
      ? statusConfig.error
      : isAutoOn
        ? statusConfig.monitoring
        : statusConfig.paused;

  // ─── Manual Refresh ─────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const newValue = await fetchSiteValue(targetUrl, cssSelector);
      const changed = lastKnownValue !== null && newValue !== lastKnownValue;
      const now = new Date().toISOString();

      const historyEntry = changed
        ? {
            timestamp: now,
            oldValue: lastKnownValue,
            newValue,
            type: monitorType || 'other',
          }
        : null;

      onUpdate(id, {
        lastKnownValue:       newValue,
        previousValue:        changed ? lastKnownValue : previousValue,
        lastUpdatedTimestamp:  now,
        lastChangedTimestamp:  changed ? now : lastChangedTimestamp,
        hasChanged:           changed,
        status:               isAutoOn ? 'monitoring' : 'paused',
        errorMessage:         null,
        ...(historyEntry ? { historyEntry } : {}),
      });

      // Dispatch notifications on change
      if (changed) {
        const settings = loadSettings();
        dispatchNotifications(
          { ...site, lastKnownValue: newValue, previousValue: lastKnownValue },
          settings
        );
      }
    } catch (err) {
      setError(err.message);
      onUpdate(id, {
        status: 'error',
        errorMessage: err.message,
        lastUpdatedTimestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── History items for timeline ──────────────────────────────────────────────
  const historyItems = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20)
      .map((entry) => ({
        color: '#7c6fcd',
        children: (
          <div className="history-item">
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatDate(entry.timestamp)}
            </Text>
            <div style={{ marginTop: 2 }}>
              <Text style={{ fontSize: 13, color: '#e2e8f0' }}>
                {MONITOR_LABELS[entry.type] || 'Update'} changed
              </Text>
            </div>
            <div className="history-change">
              <Text type="secondary" style={{ fontSize: 12 }}>
                {(entry.oldValue || '(empty)').slice(0, 50)} → {(entry.newValue || '(empty)').slice(0, 50)}
              </Text>
            </div>
          </div>
        ),
      }));
  }, [history]);

  return (
    <Spin spinning={loading} indicator={<LoadingOutlined spin style={{ fontSize: 24, color: '#7c6fcd' }} />}>
      <Card
        className={`site-card ${hasChanged ? 'site-card--changed' : ''}`}
        variant="borderless"
        title={
          <div className="card-title-row">
            <div className="card-title-left">
              <BankOutlined style={{ fontSize: 18, color: '#7c6fcd', marginRight: 8 }} />
              <Text strong style={{ fontSize: 15, color: '#e2e8f0' }}>
                {siteName}
              </Text>
            </div>
            <div className="card-title-right">
              <Tooltip title={currentStatus.text}>
                <span
                  className="status-dot"
                  style={{ background: currentStatus.color }}
                />
              </Tooltip>
              {isAutoOn && (
                <Tag color="purple" className="auto-tag" style={{ marginLeft: 4 }}>
                  ON
                </Tag>
              )}
            </div>
          </div>
        }
        extra={
          <Space size={4}>
            <Tooltip title="Refresh now">
              <Button
                type="primary"
                shape="circle"
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
                className="refresh-btn"
                size="small"
                id={`refresh-${id}`}
              />
            </Tooltip>
            <Popconfirm
              title="Remove this tracker?"
              description="This will permanently remove this exam tracker."
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
                  size="small"
                  id={`delete-${id}`}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        }
      >
        {/* ── Category & Monitor Type Badges ──────────────────────────────── */}
        <div className="card-badges">
          <Tag
            style={{
              background: `${categoryConf.color}22`,
              border: `1px solid ${categoryConf.color}44`,
              color: categoryConf.color,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {categoryConf.label}
          </Tag>
          <Tag
            style={{
              background: 'rgba(124,111,205,0.12)',
              border: '1px solid rgba(124,111,205,0.3)',
              color: '#a594f9',
              fontSize: 11,
            }}
          >
            {monitorLabel}
          </Tag>
        </div>

        {/* ── CHANGED banner ───────────────────────────────────────────────── */}
        {hasChanged && (
          <div className="changed-banner">
            <span className="changed-pulse-dot" />
            <div className="changed-content">
              <Text className="changed-text">🔔 UPDATE DETECTED</Text>
              {previousValue && (
                <div className="changed-details">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Previous: {previousValue.slice(0, 60)}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#52c41a' }}>
                    New: {lastKnownValue?.slice(0, 60)}
                  </Text>
                </div>
              )}
            </div>
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
          <Link href={targetUrl} target="_blank" rel="noopener noreferrer" ellipsis style={{ fontSize: 12 }}>
            {targetUrl}
          </Link>
        </div>

        {/* ── CSS Selector ────────────────────────────────────────────────── */}
        <div className="card-field">
          <CodeOutlined className="field-icon" />
          <Tag color="geekblue" style={{ fontFamily: 'monospace', fontSize: 11 }}>
            {cssSelector}
          </Tag>
        </div>

        {/* ── Tracked Value ───────────────────────────────────────────────── */}
        <div className="tracked-value-box">
          {error || (status === 'error' && errorMessage) ? (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#f5222d' }} />
                <Text type="danger" style={{ fontSize: 13, fontWeight: 500 }}>
                  ⚠ Unable to fetch website
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {error || errorMessage}
              </Text>
            </Space>
          ) : lastKnownValue ? (
            <div className="tracked-value-content">
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current {monitorLabel}
              </Text>
              <Space align="start" style={{ marginTop: 6 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
                <Paragraph
                  className="tracked-value-text"
                  ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                  copyable={{ tooltips: ['Copy', 'Copied!'] }}
                >
                  {lastKnownValue}
                </Paragraph>
              </Space>
            </div>
          ) : (
            <div className="tracked-value-empty">
              <FieldTimeOutlined style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)', marginRight: 10 }} />
              <Text type="secondary" style={{ fontStyle: 'italic', fontSize: 13 }}>
                Waiting for first check...
              </Text>
            </div>
          )}
        </div>

        {/* ── Auto-monitoring selector ──────────────────────────────────── */}
        <div className="interval-row">
          <ThunderboltOutlined className="field-icon" style={{ color: isAutoOn ? '#7c6fcd' : undefined }} />
          <Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
            Auto-monitoring:
          </Text>
          <Select
            size="small"
            value={autoRefreshInterval}
            options={INTERVAL_OPTIONS}
            onChange={(val) => onSetInterval(id, val)}
            className="interval-select"
            popupMatchSelectWidth={false}
            id={`interval-${id}`}
          />
          {nextCheckText && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
              {nextCheckText}
            </Text>
          )}
        </div>

        {/* ── Last Checked ────────────────────────────────────────────────── */}
        <div className="card-footer">
          <ClockCircleOutlined style={{ marginRight: 5, opacity: 0.6, fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Last checked: {formatTimeAgo(lastUpdatedTimestamp)}
          </Text>
          {lastChangedTimestamp && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
              Changed: {formatTimeAgo(lastChangedTimestamp)}
            </Text>
          )}
        </div>

        {/* ── Update History ──────────────────────────────────────────────── */}
        {history && history.length > 0 && (
          <Collapse
            ghost
            size="small"
            className="history-collapse"
            items={[
              {
                key: 'history',
                label: (
                  <Space>
                    <HistoryOutlined style={{ color: '#7c6fcd' }} />
                    <Text style={{ fontSize: 13, color: '#a594f9' }}>
                      Update History ({history.length})
                    </Text>
                  </Space>
                ),
                children: (
                  <div className="history-timeline">
                    <Timeline items={historyItems} />
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Spin>
  );
}
