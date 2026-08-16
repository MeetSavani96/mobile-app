import React, { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { apiFetch } from '../utils/api';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    setLoading(true);
    const result = await apiFetch('customer_documents');
    if (result.ok && result.data) setDocuments(result.data.documents || []);
    setLoading(false);
  };

  const docTypeLabels: Record<string, string> = {
    quotation: 'Quotation', invoice: 'Invoice', installation_report: 'Installation Report',
    warranty_certificate: 'Warranty', maintenance_report: 'Maintenance Report',
    loan_document: 'Loan Document', other: 'Other',
  };

  if (loading) return <div className="view-content"><div className="loading-center"><div className="spinner" /><p>Loading documents...</p></div></div>;

  return (
    <div className="view-content animate-fade">
      <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Documents</h2>
      {documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><FileText size={36} color="var(--primary)" /></div>
          <h3>No Documents</h3>
          <p>Your solar documents, invoices, and warranties will appear here.</p>
        </div>
      ) : documents.map((doc: any) => (
        <div key={doc.id} className="list-card">
          <div className="flex-between">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color="var(--primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{doc.file_name}</h4>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{docTypeLabels[doc.doc_type] || doc.doc_type}</span>
              </div>
            </div>
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
              <Download size={16} />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
