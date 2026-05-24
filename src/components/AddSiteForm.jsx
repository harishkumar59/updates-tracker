import React from 'react';
import { Form, Input, Button, Tooltip, Space } from 'antd';
import {
  PlusCircleOutlined,
  GlobalOutlined,
  LinkOutlined,
  CodeOutlined,
} from '@ant-design/icons';

/**
 * AddSiteForm – Ant Design Form for adding a new tracked site.
 *
 * Props:
 *  - onAdd {fn} Called with ({ siteName, targetUrl, cssSelector }) when the form is submitted.
 */
export default function AddSiteForm({ onAdd }) {
  const [form] = Form.useForm();

  const handleFinish = (values) => {
    onAdd(values);
    form.resetFields();
  };

  return (
    <div className="add-form-container">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
      >
        <div className="form-grid">
          {/* ── Website Name ─────────────────────────────────────────────── */}
          <Form.Item
            label={<span className="form-label">Website Name</span>}
            name="siteName"
            rules={[{ required: true, message: 'Please enter a name for this site.' }]}
          >
            <Input
              prefix={<GlobalOutlined style={{ color: '#7c6fcd' }} />}
              placeholder="e.g.  UPSC Notifications"
              size="large"
              className="form-input"
            />
          </Form.Item>

          {/* ── Target URL ───────────────────────────────────────────────── */}
          <Form.Item
            label={<span className="form-label">Target URL</span>}
            name="targetUrl"
            rules={[
              { required: true, message: 'Please enter the target URL.' },
              { type: 'url', message: 'Please enter a valid URL (include https://).' },
            ]}
          >
            <Input
              prefix={<LinkOutlined style={{ color: '#7c6fcd' }} />}
              placeholder="https://upsc.gov.in"
              size="large"
              className="form-input"
            />
          </Form.Item>

          {/* ── CSS Selector ─────────────────────────────────────────────── */}
          <Form.Item
            label={
              <Space>
                <span className="form-label">CSS Selector</span>
                <Tooltip
                  title={
                    <span>
                      Open DevTools (F12) → right-click the element → <b>Copy → Copy selector</b>.
                      Examples: <code>#exam-date</code>, <code>.notification-title</code>,{' '}
                      <code>h2.latest-news</code>
                    </span>
                  }
                >
                  <span className="selector-hint">What's this?</span>
                </Tooltip>
              </Space>
            }
            name="cssSelector"
            rules={[{ required: true, message: 'Please enter a CSS selector.' }]}
          >
            <Input
              prefix={<CodeOutlined style={{ color: '#7c6fcd' }} />}
              placeholder="#exam-date  or  .notification-link"
              size="large"
              className="form-input mono"
            />
          </Form.Item>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusCircleOutlined />}
            size="large"
            className="add-btn"
            block
          >
            Add Tracker
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
