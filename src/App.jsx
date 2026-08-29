import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  Layout,
  Typography,
  Row,
  Col,
  Empty,
  Divider,
  theme,
  Space,
  Tag,
} from 'antd';
import { RadarChartOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { Analytics } from '@vercel/analytics/react';
import AddSiteForm from './components/AddSiteForm';
import SiteCard from './components/SiteCard';
import { loadSites, saveSites } from './utils/localStorage';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

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

  // Persist to localStorage whenever the sites array changes.
  useEffect(() => {
    saveSites(sites);
  }, [sites]);

  // ─── Request browser notification permission once on first load ──────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ─── Add a new tracker ──────────────────────────────────────────────────────
  const handleAdd = useCallback(({ siteName, targetUrl, cssSelector }) => {
    const newSite = {
      id: uuidv4(),
      siteName,
      targetUrl,
      cssSelector,
      lastKnownValue:       null,
      lastUpdatedTimestamp: null,
      autoRefreshInterval:  0,     // Off by default — user opts in per card
      hasChanged:           false,
    };
    setSites((prev) => [newSite, ...prev]);
  }, []);

  // ─── Update a card after a fetch (manual OR auto-refresh) ───────────────────
  // `hasChanged` is true when the new value differs from the previous one.
  const handleUpdate = useCallback((id, { lastKnownValue, lastUpdatedTimestamp, hasChanged }) => {
    setSites((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, lastKnownValue, lastUpdatedTimestamp, hasChanged: hasChanged ?? false }
          : s
      )
    );
  }, []);

  // ─── Set / change the auto-refresh interval for one card ────────────────────
  const handleSetInterval = useCallback((id, minutes) => {
    setSites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, autoRefreshInterval: minutes } : s))
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
  // Registers background timers for every site with autoRefreshInterval > 0.
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
                <RadarChartOutlined />
              </div>
              <div>
                <Title level={3} className="header-title">
                  SitePulse
                </Title>
                <Text className="header-sub">Web Element Tracker</Text>
              </div>
            </Space>
            <Tag color="purple" className="beta-tag">BETA</Tag>
          </div>
        </Header>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <Content className="app-content">
          <div className="content-inner">

            {/* ── Add New Target Form ────────────────────────────────────── */}
            <section className="section">
              <div className="section-header">
                <span className="section-dot" />
                <Title level={5} className="section-title">
                  Add New Target
                </Title>
              </div>
              <AddSiteForm onAdd={handleAdd} />
            </section>

            <Divider className="section-divider" />

            {/* ── Tracked Sites Grid ─────────────────────────────────────── */}
            <section className="section">
              <div className="section-header">
                <span className="section-dot" />
                <Title level={5} className="section-title">
                  Tracked Sites
                  {sites.length > 0 && (
                    <Tag color="geekblue" style={{ marginLeft: 10, fontSize: 12 }}>
                      {sites.length}
                    </Tag>
                  )}
                </Title>
              </div>

              {sites.length === 0 ? (
                <Empty
                  description={
                    <Text type="secondary">
                      No trackers yet. Add your first site above!
                    </Text>
                  }
                  className="empty-state"
                />
              ) : (
                <Row gutter={[24, 24]}>
                  {sites.map((site) => (
                    <Col key={site.id} xs={24} sm={24} md={12} lg={8} xl={8}>
                      <SiteCard
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
            SitePulse uses a public CORS proxy to fetch page data.
            Data is stored locally in your browser — nothing is sent to any server.
          </Text>
        </Footer>

      </Layout>
      <Analytics />
    </ConfigProvider>
  );
}
