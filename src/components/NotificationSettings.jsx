import React, { useState, useEffect } from 'react';
import {
  Modal,
  Switch,
  Input,
  Typography,
  Space,
  Tag,
  Divider,
  Button,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  SendOutlined,
  WhatsAppOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { requestBrowserPermission, getChannelStatus } from '../utils/notificationService';

const { Text, Title } = Typography;

/**
 * NotificationSettings – Modal for configuring notification channels.
 *
 * Props:
 *  - open      {boolean}
 *  - onClose   {fn}
 *  - settings  {object}
 *  - onSave    {fn(settings)}
 */
export default function NotificationSettings({ open, onClose, settings, onSave }) {
  const [local, setLocal] = useState(settings);
  const [browserPermission, setBrowserPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(local);
    onClose();
  };

  const handleBrowserToggle = async (checked) => {
    if (checked) {
      const result = await requestBrowserPermission();
      setBrowserPermission(result);
      if (result === 'granted') {
        setLocal((prev) => ({ ...prev, browserNotification: true }));
      }
    } else {
      setLocal((prev) => ({ ...prev, browserNotification: false }));
    }
  };

  const browserStatus = getChannelStatus('browser', local);
  const emailStatus = getChannelStatus('email', local);
  const telegramStatus = getChannelStatus('telegram', local);
  const whatsappStatus = getChannelStatus('whatsapp', local);

  return (
    <Modal
      title={
        <Space>
          <BellOutlined style={{ color: '#7c6fcd', fontSize: 18 }} />
          <span style={{ color: '#e2e8f0' }}>Notification Settings</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={handleSave} className="add-btn" style={{ height: 36 }}>
            Save Settings
          </Button>
        </div>
      }
      className="notification-modal"
      width={520}
      styles={{
        content: { background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.07)' },
        header: { background: '#1a1f2e', borderBottom: '1px solid rgba(255,255,255,0.07)' },
        body: { background: '#1a1f2e' },
        footer: { background: '#1a1f2e', borderTop: '1px solid rgba(255,255,255,0.07)' },
      }}
    >
      <Text type="secondary" style={{ fontSize: 13 }}>
        Choose how you want to be notified when exam updates are detected.
      </Text>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />

      {/* ── Browser Notifications ──────────────────────────────────────── */}
      <div className="notif-channel">
        <div className="notif-channel-header">
          <Space>
            <BellOutlined style={{ fontSize: 18, color: '#7c6fcd' }} />
            <div>
              <Text strong style={{ color: '#e2e8f0' }}>Browser Notifications</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Desktop alerts when updates are detected
              </Text>
            </div>
          </Space>
          <div className="notif-channel-right">
            <Switch
              checked={local.browserNotification && browserPermission === 'granted'}
              onChange={handleBrowserToggle}
              size="small"
            />
            {browserStatus.available ? (
              <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 10, marginLeft: 8 }}>
                Active
              </Tag>
            ) : (
              <Tag color="orange" icon={<InfoCircleOutlined />} style={{ fontSize: 10, marginLeft: 8 }}>
                {browserPermission === 'denied' ? 'Blocked' : 'Click to enable'}
              </Tag>
            )}
          </div>
        </div>
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />

      {/* ── Email ──────────────────────────────────────────────────────── */}
      <div className="notif-channel">
        <div className="notif-channel-header">
          <Space>
            <MailOutlined style={{ fontSize: 18, color: '#fa8c16' }} />
            <div>
              <Text strong style={{ color: '#e2e8f0' }}>Email</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Receive updates via email
              </Text>
            </div>
          </Space>
          <div className="notif-channel-right">
            <Switch
              checked={local.email?.enabled}
              onChange={(checked) =>
                setLocal((prev) => ({ ...prev, email: { ...prev.email, enabled: checked } }))
              }
              size="small"
            />
            <Tag color="default" icon={<CloseCircleOutlined />} style={{ fontSize: 10, marginLeft: 8 }}>
              Not configured
            </Tag>
          </div>
        </div>
        {local.email?.enabled && (
          <div className="notif-channel-config">
            <Text style={{ fontSize: 12, color: '#c4cad6' }}>Email Address</Text>
            <Input
              placeholder="example@gmail.com"
              value={local.email?.address || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  email: { ...prev.email, address: e.target.value },
                }))
              }
              prefix={<MailOutlined style={{ color: '#7c6fcd' }} />}
              className="form-input"
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              ⚠ Backend integration required for email delivery
            </Text>
          </div>
        )}
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />

      {/* ── Telegram ───────────────────────────────────────────────────── */}
      <div className="notif-channel">
        <div className="notif-channel-header">
          <Space>
            <SendOutlined style={{ fontSize: 18, color: '#1890ff' }} />
            <div>
              <Text strong style={{ color: '#e2e8f0' }}>Telegram</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Get alerts on Telegram
              </Text>
            </div>
          </Space>
          <div className="notif-channel-right">
            <Switch
              checked={local.telegram?.enabled}
              onChange={(checked) =>
                setLocal((prev) => ({ ...prev, telegram: { ...prev.telegram, enabled: checked } }))
              }
              size="small"
            />
            <Tag color="default" icon={<CloseCircleOutlined />} style={{ fontSize: 10, marginLeft: 8 }}>
              Not configured
            </Tag>
          </div>
        </div>
        {local.telegram?.enabled && (
          <div className="notif-channel-config">
            <Text style={{ fontSize: 12, color: '#c4cad6' }}>Telegram Chat ID</Text>
            <Input
              placeholder="Enter your Telegram Chat ID"
              value={local.telegram?.chatId || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  telegram: { ...prev.telegram, chatId: e.target.value },
                }))
              }
              prefix={<SendOutlined style={{ color: '#7c6fcd' }} />}
              className="form-input"
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              ⚠ Backend integration required for Telegram delivery
            </Text>
          </div>
        )}
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.07)', margin: '12px 0' }} />

      {/* ── WhatsApp ──────────────────────────────────────────────────── */}
      <div className="notif-channel">
        <div className="notif-channel-header">
          <Space>
            <WhatsAppOutlined style={{ fontSize: 18, color: '#25d366' }} />
            <div>
              <Text strong style={{ color: '#e2e8f0' }}>WhatsApp</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>
                Receive updates on WhatsApp
              </Text>
            </div>
          </Space>
          <div className="notif-channel-right">
            <Switch
              checked={local.whatsapp?.enabled}
              onChange={(checked) =>
                setLocal((prev) => ({ ...prev, whatsapp: { ...prev.whatsapp, enabled: checked } }))
              }
              size="small"
            />
            <Tag color="default" icon={<CloseCircleOutlined />} style={{ fontSize: 10, marginLeft: 8 }}>
              Not configured
            </Tag>
          </div>
        </div>
        {local.whatsapp?.enabled && (
          <div className="notif-channel-config">
            <Text style={{ fontSize: 12, color: '#c4cad6' }}>WhatsApp Number</Text>
            <Input
              placeholder="+91 __________"
              value={local.whatsapp?.number || ''}
              onChange={(e) =>
                setLocal((prev) => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, number: e.target.value },
                }))
              }
              prefix={<WhatsAppOutlined style={{ color: '#7c6fcd' }} />}
              className="form-input"
              style={{ marginTop: 6 }}
            />
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              ⚠ Backend integration required for WhatsApp delivery
            </Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
