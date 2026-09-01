import React from 'react';
import { Form, Input, Button, Tooltip, Space, Select, message } from 'antd';
import {
  PlusCircleOutlined,
  GlobalOutlined,
  LinkOutlined,
  CodeOutlined,
  EyeOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';

// ─── Monitor Type Options ────────────────────────────────────────────────────
const MONITOR_TYPE_OPTIONS = [
  { value: 'exam_date',    label: '📅 Exam Date' },
  { value: 'deadline',     label: '⏰ Application Deadline' },
  { value: 'notification', label: '📢 Exam Notification' },
  { value: 'admit_card',   label: '🎫 Admit Card' },
  { value: 'result',       label: '📊 Result' },
  { value: 'answer_key',   label: '🔑 Answer Key' },
  { value: 'status',       label: '📋 Application Status' },
  { value: 'other',        label: '📌 Other' },
];

// ─── Category Options ────────────────────────────────────────────────────────
const CATEGORY_OPTIONS = [
  { value: 'upsc',      label: '🏛 UPSC' },
  { value: 'ssc',       label: '📝 SSC' },
  { value: 'banking',   label: '🏦 Banking' },
  { value: 'railway',   label: '🚂 Railway' },
  { value: 'defence',   label: '🎖 Defence' },
  { value: 'state_psc', label: '🏢 State PSC' },
  { value: 'teaching',  label: '📚 Teaching' },
  { value: 'other',     label: '📌 Other' },
];

/**
 * AddTrackerForm – Form for adding a new government exam tracker.
 *
 * Props:
 *  - onAdd {fn} Called with ({ siteName, targetUrl, cssSelector, monitorType, category }) on submit.
 */
export default function AddTrackerForm({ onAdd }) {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const handleFinish = (values) => {
    onAdd(values);
    form.resetFields();
    messageApi.success({
      content: '✓ Tracker added successfully',
      duration: 3,
      style: { marginTop: '10px' },
    });
  };

  return (
    <div className="add-form-container">
      {contextHolder}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={false}
        initialValues={{ monitorType: 'exam_date', category: 'other' }}
      >
        <div className="form-grid">
          {/* ── Exam / Website Name ────────────────────────────────────── */}
          <Form.Item
            label={<span className="form-label">Exam / Website Name</span>}
            name="siteName"
            rules={[{ required: true, message: 'Please enter an exam or website name.' }]}
          >
            <Input
              prefix={<GlobalOutlined style={{ color: '#7c6fcd' }} />}
              placeholder="e.g. UPSC Civil Services"
              size="large"
              className="form-input"
              id="tracker-name-input"
            />
          </Form.Item>

          {/* ── Official Website URL ────────────────────────────────────── */}
          <Form.Item
            label={<span className="form-label">Official Website URL</span>}
            name="targetUrl"
            rules={[
              { required: true, message: 'Please enter the official website URL.' },
              { type: 'url', message: 'Please enter a valid URL (include https://).' },
            ]}
          >
            <Input
              prefix={<LinkOutlined style={{ color: '#7c6fcd' }} />}
              placeholder="https://upsc.gov.in"
              size="large"
              className="form-input"
              id="tracker-url-input"
            />
          </Form.Item>

          {/* ── What do you want to monitor? ───────────────────────────── */}
          <Form.Item
            label={<span className="form-label">What do you want to monitor?</span>}
            name="monitorType"
          >
            <Select
              options={MONITOR_TYPE_OPTIONS}
              size="large"
              className="form-select"
              popupMatchSelectWidth={false}
              suffixIcon={<EyeOutlined style={{ color: '#7c6fcd' }} />}
              id="tracker-monitor-type"
            />
          </Form.Item>

          {/* ── Exam Category ──────────────────────────────────────────── */}
          <Form.Item
            label={<span className="form-label">Exam Category</span>}
            name="category"
          >
            <Select
              options={CATEGORY_OPTIONS}
              size="large"
              className="form-select"
              popupMatchSelectWidth={false}
              suffixIcon={<AppstoreOutlined style={{ color: '#7c6fcd' }} />}
              id="tracker-category"
            />
          </Form.Item>

          {/* ── CSS Selector ───────────────────────────────────────────── */}
          <Form.Item
            label={
              <Space>
                <span className="form-label">CSS Selector</span>
                <Tooltip
                  title={
                    <span>
                      A CSS selector tells the tracker which part of the website
                      should be monitored. Open DevTools (F12) → right-click the
                      element → <b>Copy → Copy selector</b>.
                      <br /><br />
                      Examples: <code>#exam-date</code>, <code>.notification-link</code>,{' '}
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
              id="tracker-css-selector"
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
            id="add-tracker-btn"
          >
            + Add Tracker
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export { MONITOR_TYPE_OPTIONS, CATEGORY_OPTIONS };
