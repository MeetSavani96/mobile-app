import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, RefreshCw, Download, Search,
  Users, FileText, CheckCircle, Wrench,
  AlertCircle, DollarSign, Award, ShieldAlert, BarChart3
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface AdminReportsViewProps {
  onBack: () => void;
}

type DateFilterType = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom' | 'all';
type ReportTabType = 'sales' | 'revenue' | 'quotation' | 'installation' | 'payment' | 'engineer' | 'customer' | 'document';

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ReportTabType>('sales');

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterType>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── LOAD DASHBOARD METRICS & CHARTS ───────────────────────────────────────
  const fetchDashboardMetrics = async () => {
    setLoading(true);
    const res = await apiFetch('dashboard_statistics');
    if (res.ok && res.data) {
      setMetrics(res.data);
    } else {
      showToast(res.error || 'Failed to load analytical metrics.', 'error');
    }
    setLoading(false);
  };

  // ── LOAD TABULAR REPORTS ──────────────────────────────────────────────────
  const fetchReportData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('date_filter', dateFilter);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());

    const endpoint = `${activeTab}_report&${params.toString()}`;
    const res = await apiFetch(endpoint);

    if (res.ok && res.data) {
      setReportData(res.data);
      setCurrentPage(1); // reset to page 1
    } else {
      showToast(res.error || `Failed to retrieve ${activeTab} data.`, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeTab, dateFilter, startDate, endDate, searchQuery]);

  // ── CSV & EXCEL EXPORT GENERATOR ──────────────────────────────────────────
  const exportToCSV = (format: 'csv' | 'excel') => {
    if (reportData.length === 0) {
      showToast('No record data available to export.', 'error');
      return;
    }

    // Determine CSV headers based on active tabular reports
    let headers: string[] = [];
    let keys: string[] = [];

    switch (activeTab) {
      case 'sales':
        headers = ['Lead ID', 'Full Name', 'Email', 'Phone', 'City', 'State', 'Capacity (KW)', 'Status', 'Date Created'];
        keys = ['id', 'name', 'email', 'phone', 'city', 'state', 'system_size_kw', 'status', 'created_at'];
        break;
      case 'revenue':
        headers = ['Invoice ID', 'Invoice No.', 'Customer Name', 'Amount Due', 'GST Amount', 'Status', 'Billing Date'];
        keys = ['id', 'invoice_number', 'customer_name', 'amount_due', 'gst_amount', 'status', 'created_at'];
        break;
      case 'quotation':
        headers = ['Proposal ID', 'Customer Name', 'Subtotal', 'Discount', 'GST', 'Grand Total', 'Validity Date', 'Status', 'Created At'];
        keys = ['id', 'customer_name', 'subtotal', 'discount', 'gst', 'grand_total', 'validity_date', 'status', 'created_at'];
        break;
      case 'installation':
        headers = ['Project ID', 'Customer Name', 'Project Status', 'Schedule Install Date', 'Estimated Completion', 'Created At'];
        keys = ['id', 'customer_name', 'status', 'scheduled_install_date', 'estimated_completion_date', 'created_at'];
        break;
      case 'payment':
        headers = ['Transaction ID', 'Customer Name', 'Invoice No.', 'Amount Paid', 'Payment Status', 'Transaction Date'];
        keys = ['id', 'customer_name', 'invoice_number', 'amount_paid', 'payment_status', 'created_at'];
        break;
      case 'engineer':
        headers = ['Roster ID', 'Engineer Name', 'Mobile Number', 'Email', 'Expertise Skills', 'Availability', 'Created At'];
        keys = ['id', 'name', 'mobile', 'email', 'skills', 'availability', 'created_at'];
        break;
      case 'customer':
        headers = ['Customer ID', 'Full Name', 'Email', 'Phone', 'Onboarding Date', 'Enquiries', 'Proposals', 'Completed Installs'];
        keys = ['id', 'name', 'email', 'phone', 'created_at', 'enquiries_count', 'quotations_count', 'completed_projects_count'];
        break;
      case 'document':
        headers = ['Doc ID', 'Type', 'Customer Name', 'File Name', 'Uploaded At', 'Verification Status', 'Verified By', 'Verified At', 'Auditor Notes'];
        keys = ['id', 'doc_type', 'customer_name', 'file_name', 'uploaded_at', 'status', 'verified_by', 'verified_at', 'notes'];
        break;
    }

    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        keys.map(k => {
          let val = row[k] ?? '';
          // escape quotes
          val = typeof val === 'string' ? val.replace(/"/g, '""') : val;
          return `"${val}"`;
        }).join(',')
      )
    ].join('\n');

    const mime = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel';
    const ext = format === 'csv' ? 'csv' : 'xls';
    const blob = new Blob([csvContent], { type: `${mime};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AKV_${activeTab}_report_${new Date().toISOString().slice(0, 10)}.${ext}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded ${activeTab} report in ${format.toUpperCase()} format!`);
  };

  // ── PDF EXPORT COMPLIANCE ──────────────────────────────────────────────────
  const exportToPDF = () => {
    // Standard system print utility configured for document exports
    window.print();
    showToast('Sent PDF report layout to printer!');
  };

  // Pagination calculations
  const totalPages = Math.ceil(reportData.length / itemsPerPage);
  const paginatedData = reportData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="animate-fade">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: toast.type === 'success' ? 'var(--color-green)' : '#ef4444',
          color: '#fff', padding: '10px 18px', borderRadius: '8px', fontSize: '13px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={onBack} className="modal-close" style={{ background: 'rgba(255,255,255,0.04)', color: '#fff' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: 0, fontWeight: 700 }}>Reports & BI Analytics</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Corporate solar analytics, metrics charts, and operational logs.</span>
          </div>
        </div>
        <button onClick={fetchDashboardMetrics} className="modal-close" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-cyan)' }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ── 11 KPI METRICS SLIDER / GRID ──────────────────────────────────────── */}
      {metrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Customers</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} color="var(--color-cyan)" /> {metrics.total_customers}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Enquiries</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BarChart3 size={14} color="var(--color-amber)" /> {metrics.total_enquiries}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Quotations</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={14} color="var(--color-cyan)" /> {metrics.active_quotations}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Accepted Proposals</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={14} color="var(--color-green)" /> {metrics.accepted_quotations}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Running Installs</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wrench size={14} color="var(--color-cyan)" /> {metrics.running_installations}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Completed Projects</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={14} color="var(--color-green)" /> {metrics.completed_projects}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Pending Payments</span>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldAlert size={14} color="#ef4444" /> {metrics.pending_payments}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Monthly Revenue</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <DollarSign size={13} /> {metrics.monthly_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0 }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Total Revenue</span>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <DollarSign size={13} /> {metrics.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="glass-card" style={{ padding: '8px 12px', margin: 0, gridColumn: 'span 1' }}>
            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Engineers Roster</span>
            <div style={{ fontSize: '11px', color: '#fff', display: 'flex', gap: '6px', marginTop: '2px' }}>
              <span style={{ color: 'var(--color-green)' }}>Avail: {metrics.engineers_available}</span>
              <span style={{ color: 'var(--color-cyan)' }}>Busy: {metrics.engineers_assigned}</span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ height: '120px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', animation: 'pulse 1.5s infinite', marginBottom: '16px' }} />
      )}

      {/* ── 7 RESPONSIVE SVG CHARTS SECTION ───────────────────────────────────── */}
      {metrics && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          
          {/* Chart 1 & Chart 2 (Side-by-side row) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Chart 1: Monthly Revenue */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monthly Revenue collected</span>
              <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px', paddingTop: '10px' }}>
                {metrics.chart_monthly_revenue.map((item: any, i: number) => {
                  const maxVal = Math.max(...metrics.chart_monthly_revenue.map((x: any) => x.value)) || 1;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', height: `${(item.value / maxVal) * 45}px`, background: 'linear-gradient(to top, var(--color-cyan), var(--color-green))', borderRadius: '2px 2px 0 0' }} />
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Monthly Enquiries */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Monthly Enquiries Load</span>
              <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6px', paddingTop: '10px' }}>
                {metrics.chart_monthly_enquiries.map((item: any, i: number) => {
                  const maxVal = Math.max(...metrics.chart_monthly_enquiries.map((x: any) => x.value)) || 1;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', height: `${(item.value / maxVal) * 45}px`, background: 'linear-gradient(to top, var(--color-amber), var(--color-cyan))', borderRadius: '2px 2px 0 0' }} />
                      <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart 3: Customer Growth Area Chart */}
          <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Customer Growth Curve</span>
            <div style={{ position: 'relative', height: '50px', width: '100%' }}>
              <svg viewBox={`0 0 300 50`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.4"/>
                    <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <path 
                  d={`M 0,50 L ${metrics.chart_customer_growth.map((item: any, i: number) => {
                    const maxVal = Math.max(...metrics.chart_customer_growth.map((x: any) => x.value)) || 1;
                    return `${(i / (metrics.chart_customer_growth.length - 1)) * 300},${50 - (item.value / maxVal) * 40}`;
                  }).join(' L ')} L 300,50 Z`}
                  fill="url(#growthGradient)"
                />
                <path 
                  d={`M ${metrics.chart_customer_growth.map((item: any, i: number) => {
                    const maxVal = Math.max(...metrics.chart_customer_growth.map((x: any) => x.value)) || 1;
                    return `${(i / (metrics.chart_customer_growth.length - 1)) * 300},${50 - (item.value / maxVal) * 40}`;
                  }).join(' L ')}`}
                  fill="none" 
                  stroke="var(--color-green)" 
                  strokeWidth="2" 
                />
              </svg>
              <div className="flex-between" style={{ fontSize: '7px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {metrics.chart_customer_growth.map((item: any, i: number) => (
                  <span key={i}>{item.label} ({item.value})</span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 4 & 5 side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Chart 4: Installation Progress status bar */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Installation Statuses</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {metrics.chart_installation_progress.map((item: any, i: number) => {
                  const maxVal = Math.max(...metrics.chart_installation_progress.map((x: any) => x.value)) || 1;
                  return (
                    <div key={i} style={{ fontSize: '9px' }}>
                      <div className="flex-between" style={{ color: '#fff', marginBottom: '2px' }}>
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: 'var(--color-cyan)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 5: Payment Collection breakdown */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Payment Collections</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {metrics.chart_payment_collection.map((item: any, i: number) => {
                  const total = metrics.chart_payment_collection.reduce((a: number, b: any) => a + b.value, 0) || 1;
                  const pct = Math.round((item.value / total) * 100);
                  const colors = i === 0 ? 'var(--color-green)' : (i === 1 ? 'var(--color-amber)' : '#ef4444');
                  return (
                    <div key={i} style={{ fontSize: '9px' }}>
                      <div className="flex-between" style={{ color: '#fff', marginBottom: '2px' }}>
                        <span>{item.label}</span>
                        <span>{pct}% ({item.value})</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chart 6 & 7 side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Chart 6: Engineer Workload */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Engineer Assignments</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {metrics.chart_engineer_workload.map((item: any, i: number) => {
                  const maxVal = Math.max(...metrics.chart_engineer_workload.map((x: any) => x.value)) || 1;
                  return (
                    <div key={i} style={{ fontSize: '9px' }}>
                      <div className="flex-between" style={{ color: '#fff', marginBottom: '2px' }}>
                        <span>{item.label}</span>
                        <span>{item.value} tasks</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(item.value / maxVal) * 100}%`, background: 'var(--color-amber)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 7: Product Category Distribution */}
            <div className="glass-card" style={{ padding: '12px', margin: 0 }}>
              <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Product Share</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {metrics.chart_product_distribution.map((item: any, i: number) => {
                  return (
                    <div key={i} style={{ fontSize: '8px' }}>
                      <div className="flex-between" style={{ color: '#fff', marginBottom: '1px' }}>
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.value}%`, background: 'var(--color-green)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── REPORTS SELECTION & TABULAR DATAGRID ──────────────────────────────── */}
      <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '10px' }}>Tabular Operational Reports</h3>
      
      {/* 8 Tabs Selection Toolbar */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
        {[
          { id: 'sales', label: 'Sales' },
          { id: 'revenue', label: 'Revenue' },
          { id: 'quotation', label: 'Quotations' },
          { id: 'installation', label: 'Installations' },
          { id: 'payment', label: 'Payments' },
          { id: 'engineer', label: 'Engineers' },
          { id: 'customer', label: 'Customers' },
          { id: 'document', label: 'Documents' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as ReportTabType); setCurrentPage(1); }}
            style={{
              padding: '6px 12px', fontSize: '11px', borderRadius: '20px', border: 'none', margin: 0,
              background: activeTab === tab.id ? 'var(--color-green)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab.id ? '#000' : 'var(--text-muted)', cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500, whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card" style={{ padding: '12px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="search"
                className="form-input"
                placeholder={`Search report entries…`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '30px', fontSize: '12px', height: '32px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <select
                className="form-input"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as DateFilterType)}
                style={{ fontSize: '12px', height: '32px', width: '110px', padding: '0 6px', margin: 0 }}
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Date</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Date</span>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ fontSize: '12px', height: '30px', padding: '0 6px' }}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>End Date</span>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ fontSize: '12px', height: '30px', padding: '0 6px' }}
                />
              </div>
            </div>
          )}

          {/* Exports Buttons Grid */}
          <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
            <button
              onClick={() => exportToCSV('csv')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '6px 0', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={() => exportToCSV('excel')}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '6px 0', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}
            >
              <Download size={12} /> Excel
            </button>
            <button
              onClick={exportToPDF}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '6px 0', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: 0 }}
            >
              <FileText size={12} /> PDF Print
            </button>
          </div>

        </div>
      </div>

      {/* Reports Table Data Grid */}
      <div className="glass-card" style={{ padding: '10px', marginBottom: '16px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px 0' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '32px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                  {activeTab === 'sales' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Lead</th>
                      <th style={{ padding: '8px 4px' }}>Contact</th>
                      <th style={{ padding: '8px 4px' }}>Location</th>
                      <th style={{ padding: '8px 4px' }}>Capacity</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                    </>
                  )}
                  {activeTab === 'revenue' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Invoice No</th>
                      <th style={{ padding: '8px 4px' }}>Customer</th>
                      <th style={{ padding: '8px 4px' }}>Amount Due</th>
                      <th style={{ padding: '8px 4px' }}>GST</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                    </>
                  )}
                  {activeTab === 'quotation' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Prop ID</th>
                      <th style={{ padding: '8px 4px' }}>Customer</th>
                      <th style={{ padding: '8px 4px' }}>Subtotal</th>
                      <th style={{ padding: '8px 4px' }}>Grand Total</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                    </>
                  )}
                  {activeTab === 'installation' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Proj ID</th>
                      <th style={{ padding: '8px 4px' }}>Customer</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                      <th style={{ padding: '8px 4px' }}>Survey Date</th>
                      <th style={{ padding: '8px 4px' }}>Est. Finish</th>
                    </>
                  )}
                  {activeTab === 'payment' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Trans ID</th>
                      <th style={{ padding: '8px 4px' }}>Customer</th>
                      <th style={{ padding: '8px 4px' }}>Paid</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                      <th style={{ padding: '8px 4px' }}>Date</th>
                    </>
                  )}
                  {activeTab === 'engineer' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Roster</th>
                      <th style={{ padding: '8px 4px' }}>Skills</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                    </>
                  )}
                  {activeTab === 'customer' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Customer ID</th>
                      <th style={{ padding: '8px 4px' }}>Contact</th>
                      <th style={{ padding: '8px 4px' }}>Enq</th>
                      <th style={{ padding: '8px 4px' }}>Quots</th>
                      <th style={{ padding: '8px 4px' }}>Completed</th>
                    </>
                  )}
                  {activeTab === 'document' && (
                    <>
                      <th style={{ padding: '8px 4px' }}>Doc ID</th>
                      <th style={{ padding: '8px 4px' }}>Type</th>
                      <th style={{ padding: '8px 4px' }}>Customer</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                      <th style={{ padding: '8px 4px' }}>Remarks</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#fff' }}>
                    {activeTab === 'sales' && (
                      <>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '8px 4px' }}>{row.phone}<br/><span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{row.email}</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.city}, {row.state}</td>
                        <td style={{ padding: '8px 4px' }}>{row.system_size_kw} KW</td>
                        <td style={{ padding: '8px 4px' }}><span className="badge badge-info">{row.status}</span></td>
                      </>
                    )}
                    {activeTab === 'revenue' && (
                      <>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.invoice_number}</td>
                        <td style={{ padding: '8px 4px' }}>{row.customer_name}</td>
                        <td style={{ padding: '8px 4px' }}>${Number(row.amount_due).toLocaleString()}</td>
                        <td style={{ padding: '8px 4px' }}>${Number(row.gst_amount).toLocaleString()}</td>
                        <td style={{ padding: '8px 4px' }}><span className={`badge ${row.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span></td>
                      </>
                    )}
                    {activeTab === 'quotation' && (
                      <>
                        <td style={{ padding: '8px 4px' }}>#{row.id}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.customer_name}</td>
                        <td style={{ padding: '8px 4px' }}>${Number(row.subtotal).toLocaleString()}</td>
                        <td style={{ padding: '8px 4px', color: 'var(--color-green)' }}>${Number(row.grand_total).toLocaleString()}</td>
                        <td style={{ padding: '8px 4px' }}><span className={`badge ${row.status === 'accepted' ? 'badge-success' : 'badge-info'}`}>{row.status}</span></td>
                      </>
                    )}
                    {activeTab === 'installation' && (
                      <>
                        <td style={{ padding: '8px 4px' }}>#{row.id}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.customer_name}</td>
                        <td style={{ padding: '8px 4px' }}><span className="badge badge-info">{row.status}</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.scheduled_install_date ? row.scheduled_install_date.slice(0, 10) : 'Pending'}</td>
                        <td style={{ padding: '8px 4px' }}>{row.estimated_completion_date || 'Pending'}</td>
                      </>
                    )}
                    {activeTab === 'payment' && (
                      <>
                        <td style={{ padding: '8px 4px' }}>#{row.id}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.customer_name}</td>
                        <td style={{ padding: '8px 4px', color: 'var(--color-green)' }}>${Number(row.amount_paid).toLocaleString()}</td>
                        <td style={{ padding: '8px 4px' }}><span className="badge badge-success">{row.payment_status}</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.created_at.slice(0, 10)}</td>
                      </>
                    )}
                    {activeTab === 'engineer' && (
                      <>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.name}<br/><span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{row.mobile}</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.skills}</td>
                        <td style={{ padding: '8px 4px' }}><span className={`badge ${row.availability === 'available' ? 'badge-success' : 'badge-warning'}`}>{row.availability}</span></td>
                      </>
                    )}
                    {activeTab === 'customer' && (
                      <>
                        <td style={{ padding: '8px 4px' }}>#{row.id}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.name}<br/><span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{row.phone}</span></td>
                        <td style={{ padding: '8px 4px' }}>{row.enquiries_count}</td>
                        <td style={{ padding: '8px 4px' }}>{row.quotations_count}</td>
                        <td style={{ padding: '8px 4px' }}>{row.completed_projects_count}</td>
                      </>
                    )}
                    {activeTab === 'document' && (
                      <>
                        <td style={{ padding: '8px 4px' }}>#{row.id}</td>
                        <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>{row.doc_type.replace('_', ' ')}</td>
                        <td style={{ padding: '8px 4px', fontWeight: 600 }}>{row.customer_name}</td>
                        <td style={{ padding: '8px 4px' }}><span className={`badge ${row.status === 'verified' ? 'badge-success' : (row.status === 'rejected' ? 'badge-warning' : 'badge-info')}`}>{row.status}</span></td>
                        <td style={{ padding: '8px 4px', fontSize: '9px', color: 'var(--text-muted)' }}>{row.notes || 'None'}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex-between" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Showing Page {currentPage} of {totalPages} ({reportData.length} records)</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '10px', margin: 0 }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '10px', margin: 0 }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--text-muted)' }} />
            No records matched the filter criteria.
          </div>
        )}
      </div>

    </div>
  );
};
