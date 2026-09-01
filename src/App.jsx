import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ConfigProvider,
  Layout,
  Typography,
  Row,
  Col,
  Divider,
  theme,
  Space,
  Tag,
  Input,
  Button,
  Tooltip,
} from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  SearchOutlined,
  BankOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import AddTrackerForm from './components/AddTrackerForm';
import TrackerCard from './components/TrackerCard';
import NotificationSettings from './components/NotificationSettings';
import { loadSites, saveSites, loadSettings, saveSettings } from './utils/localStorage';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { requestBrowserPermission } from './utils/notificationService';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// ─── Category filter options ─────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',       label: 'All' },
  { key: 'upsc',      label: 'UPSC' },
  { key: 'ssc',       label: 'SSC' },
  { key: 'banking',   label: 'Banking' },
  { key: 'railway',   label: 'Railway' },
  { key: 'defence',   label: 'Defence' },
  { key: 'state_psc', label: 'State PSC' },
  { key: 'teaching',  label: 'Teaching' },
  { key: 'other',     label: 'Other' },
];

// ─── Ant Design dark-mode token overrides ─────────────────────────────────────
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#7c6fcd',
    colorBgContainer: '#1a1f2e',
    colorBgLayout: '#0f1117',
    borderRadius: 12,
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
};

export default function App() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [sites, setSites] = useState(() => loadSites());
  const [notifSettings, setNotifSettings] = useState(() => loadSettings());
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Persist to localStorage whenever the sites array changes.
  useEffect(() => { saveSites(sites); }, [sites]);
  useEffect(() => { saveSettings(notifSettings); }, [notifSettings]);

  // ─── Request browser notification permission once on first load ──────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      requestBrowserPermission();
    }
  }, []);

  // ─── Dashboard statistics (computed from state) ──────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const activeCount = sites.filter((s) => (s.autoRefreshInterval ?? 0) > 0).length;
    const updatesToday = sites.reduce((count, s) => {
      const h = s.history || [];
      return count + h.filter((e) => new Date(e.timestamp).getTime() >= todayMs).length;
    }, 0);

    let lastUpdate = null;
    sites.forEach((s) => {
      if (s.lastChangedTimestamp) {
        if (!lastUpdate || new Date(s.lastChangedTimestamp) > new Date(lastUpdate)) {
          lastUpdate = s.lastChangedTimestamp;
        }
      }
    });

    const lastUpdateText = lastUpdate ? formatTimeAgo(lastUpdate) : 'No updates yet';

    return {
      total: sites.length,
      active: activeCount,
      updatesToday,
      lastUpdate: lastUpdateText,
    };
  }, [sites]);

  // ─── Filtered sites ────────────────────────────────────────────────────────
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      const matchesSearch = !searchQuery ||
        site.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        site.targetUrl.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || site.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [sites, searchQuery, activeCategory]);

  // ─── Add a new tracker ──────────────────────────────────────────────────────
  const handleAdd = useCallback(({ siteName, targetUrl, cssSelector, monitorType, category }) => {
    const newSite = {
      id: uuidv4(),
      siteName,
      targetUrl,
      cssSelector,
      monitorType:          monitorType || 'other',
      category:             category || 'other',
      lastKnownValue:       null,
      previousValue:        null,
      lastUpdatedTimestamp:  null,
      lastChangedTimestamp:  null,
      autoRefreshInterval:  0,
      hasChanged:           false,
      status:               'paused',
      errorMessage:         null,
      history:              [],
    };
    setSites((prev) => [newSite, ...prev]);
  }, []);

  // ─── Update a card after a fetch (manual OR auto-refresh) ───────────────────
  const handleUpdate = useCallback((id, patch) => {
    setSites((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;

        const updated = { ...s, ...patch };

        // Append history entry if present
        if (patch.historyEntry) {
          updated.history = [
            ...(s.history || []),
            patch.historyEntry,
          ];
          delete updated.historyEntry;
        }

        return updated;
      })
    );
  }, []);

  // ─── Set / change the auto-refresh interval for one card ────────────────────
  const handleSetInterval = useCallback((id, minutes) => {
    setSites((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, autoRefreshInterval: minutes, status: minutes > 0 ? 'monitoring' : 'paused' }
          : s
      )
    );
  }, []);

  // ─── Dismiss the "CHANGED" badge on a card ──────────────────────────────────
  const handleDismissChange = useCallback((id) => {
    setSites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, hasChanged: false } : s))
    );
  }, []);

  // ─── Delete a tracker ───────────────────────────────────────────────────────
  const handleDelete = useCallback((id) => {
    setSites((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ─── Auto-refresh hook ──────────────────────────────────────────────────────
  useAutoRefresh(sites, handleUpdate);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <ConfigProvider theme={darkTheme}>
      <Layout className="app-layout">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Header className="app-header">
          <div className="header-inner">
            <Space align="center" size={12}>
              <div className="logo-icon">
                <BellOutlined />
              </div>
              <div>
                <Title level={3} className="header-title">
                  ExamPulse
                </Title>
                <Text className="header-sub">Government Exam Notifier</Text>
              </div>
            </Space>
            <Space size={16}>
              <div className="system-status">
                <span className="system-status-dot" />
                <Text style={{ fontSize: 12, color: '#52c41a' }}>System Online</Text>
              </div>
              <Tooltip title="Notification Settings">
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  className="settings-btn"
                  onClick={() => setShowNotifSettings(true)}
                  id="settings-btn"
                />
              </Tooltip>
            </Space>
          </div>
        </Header>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <Content className="app-content">
          <div className="content-inner">

            {/* ── Hero Section ──────────────────────────────────────────── */}
            <section className="hero-section">
              <div className="hero-content">
                <h1 className="hero-title">
                  Never Miss a Government Exam Update
                </h1>
                <p className="hero-description">
                  Automatically monitor official government exam websites for
                  exam dates, notifications, application deadlines, admit cards,
                  results and other important updates.
                </p>
                <div className="hero-status">
                  <span className="hero-status-dot" />
                  <Text style={{ fontSize: 13, color: '#52c41a' }}>
                    Monitoring is active
                  </Text>
                </div>
              </div>
            </section>

            {/* ── Dashboard Statistics ──────────────────────────────────── */}
            <section className="stats-section">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(124,111,205,0.15)' }}>
                    <BankOutlined style={{ color: '#7c6fcd', fontSize: 20 }} />
                  </div>
                  <div className="stat-info">
                    <Text className="stat-value">{stats.total}</Text>
                    <Text className="stat-label">Tracked Exams</Text>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(82,196,26,0.15)' }}>
                    <ThunderboltOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                  </div>
                  <div className="stat-info">
                    <Text className="stat-value">{stats.active}</Text>
                    <Text className="stat-label">Active Trackers</Text>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(250,140,22,0.15)' }}>
                    <RiseOutlined style={{ color: '#fa8c16', fontSize: 20 }} />
                  </div>
                  <div className="stat-info">
                    <Text className="stat-value">{stats.updatesToday}</Text>
                    <Text className="stat-label">Updates Today</Text>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(24,144,255,0.15)' }}>
                    <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 20 }} />
                  </div>
                  <div className="stat-info">
                    <Text className="stat-value stat-value-sm">{stats.lastUpdate}</Text>
                    <Text className="stat-label">Last Update</Text>
                  </div>
                </div>
              </div>
            </section>

            <Divider className="section-divider" />

            {/* ── Add New Exam Tracker Form ────────────────────────────── */}
            <section className="section">
              <div className="section-header">
                <span className="section-dot" />
                <Title level={5} className="section-title">
                  Add Government Exam Tracker
                </Title>
              </div>
              <AddTrackerForm onAdd={handleAdd} />
            </section>

            <Divider className="section-divider" />

            {/* ── My Exam Trackers ─────────────────────────────────────── */}
            <section className="section">
              <div className="section-header">
                <span className="section-dot" />
                <Title level={5} className="section-title">
                  My Exam Trackers
                  {sites.length > 0 && (
                    <Tag color="geekblue" style={{ marginLeft: 10, fontSize: 12 }}>
                      {sites.length}
                    </Tag>
                  )}
                </Title>
              </div>

              {/* ── Search & Filter Bar ──────────────────────────────────── */}
              {sites.length > 0 && (
                <div className="filter-bar">
                  <Input
                    placeholder="Search exams..."
                    prefix={<SearchOutlined style={{ color: '#7c6fcd' }} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input form-input"
                    allowClear
                    id="search-exams"
                  />
                  <div className="category-filters">
                    {CATEGORIES.map((cat) => (
                      <Tag
                        key={cat.key}
                        className={`category-tag ${activeCategory === cat.key ? 'category-tag--active' : ''}`}
                        onClick={() => setActiveCategory(cat.key)}
                        style={{ cursor: 'pointer' }}
                      >
                        {cat.label}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {sites.length === 0 ? (
                /* ── Empty State ────────────────────────────────────────── */
                <div className="empty-state-custom">
                  <div className="empty-icon">
                    <BankOutlined />
                  </div>
                  <Title level={4} style={{ color: '#e2e8f0', marginBottom: 8 }}>
                    No exam trackers yet
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14, maxWidth: 400, display: 'block', textAlign: 'center' }}>
                    Start monitoring an official government exam website
                    to automatically receive important updates.
                  </Text>
                  <Button
                    type="primary"
                    icon={<PlusCircleOutlined />}
                    className="add-btn"
                    style={{ marginTop: 24, height: 44, paddingInline: 32 }}
                    onClick={() => {
                      document.getElementById('tracker-name-input')?.focus();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    id="empty-add-btn"
                  >
                    + Add Exam Tracker
                  </Button>
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="empty-state-custom" style={{ padding: '40px 0' }}>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    No trackers match your search.
                  </Text>
                </div>
              ) : (
                <Row gutter={[24, 24]}>
                  {filteredSites.map((site) => (
                    <Col key={site.id} xs={24} sm={24} md={12} lg={8} xl={8}>
                      <TrackerCard
                        site={site}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        onSetInterval={handleSetInterval}
                        onDismissChange={handleDismissChange}
                      />
                    </Col>
                  ))}
                </Row>
              )}
            </section>
          </div>
        </Content>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <Footer className="app-footer">
          <Text type="secondary" style={{ fontSize: 12 }}>
            ExamPulse uses a public CORS proxy to fetch page data.
            Data is stored locally in your browser — nothing is sent to any server.
          </Text>
        </Footer>

        {/* ── Notification Settings Modal ──────────────────────────────── */}
        <NotificationSettings
          open={showNotifSettings}
          onClose={() => setShowNotifSettings(false)}
          settings={notifSettings}
          onSave={setNotifSettings}
        />

      </Layout>
    </ConfigProvider>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
