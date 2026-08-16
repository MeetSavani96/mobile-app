import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, Plus, Trash2, ClipboardCheck,
  CheckCircle2, Wrench, UserPlus, Search
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { CustomerService } from '../utils/customerService';
import type { Customer } from '../types/customer';
import { PageHeader, StatusBadge, EmptyState, Modal } from '../components/ui';

interface AdminInstallationsProps {
  onBack?: () => void;
}

interface Engineer {
  id: number;
  name: string;
  availability: string;
}

interface ProjectTask {
  id: number;
  title: string;
  status: 'pending' | 'completed';
}

interface InstallationProject {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  status: string;
  scheduled_survey_date: string | null;
  scheduled_install_date: string | null;
  estimated_completion_date: string | null;
  site_photos: string[];
  completion_photos: string[];
  customer_signature: string | null;
  warranty_card_url: string | null;
  internal_notes: string | null;
  created_at: string;
  quote_amount?: number;
  assigned_engineers?: { id: number; name: string; mobile?: string; email?: string }[];
  tasks?: ProjectTask[];
}

export const AdminInstallationsView: React.FC<AdminInstallationsProps> = ({ onBack }) => {
  const [screen, setScreen] = useState<'list' | 'form' | 'detail'>('list');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<InstallationProject[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedProject, setSelectedProject] = useState<InstallationProject | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const [formCustomer, setFormCustomer] = useState<number>(0);
  const [formEstDate, setFormEstDate] = useState('');
  const [formStatus, setFormStatus] = useState('lead_received');
  const [formNotes, setFormNotes] = useState('');

  const [assignEngineerId, setAssignEngineerId] = useState<number>(0);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProjects = async () => {
    setLoading(true);
    const query = `list_installations&search=${encodeURIComponent(search)}&status=${statusFilter}`;
    const res = await apiFetch(query);
    if (res.ok && res.data) {
      setProjects(res.data.installations || res.data || []);
    }
    setLoading(false);
  };

  const fetchAuxData = async () => {
    const custRes = await CustomerService.getCustomers('');
    if (custRes.data) setCustomers(custRes.data);

    const engRes = await apiFetch('admin_list_engineers');
    if (engRes.ok && engRes.data) {
      setEngineers(engRes.data.engineers || engRes.data || []);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search, statusFilter]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  const viewDetails = async (id: number) => {
    setSelectedId(id);
    setLoading(true);
    setScreen('detail');
    const res = await apiFetch(`installation_details&id=${id}`);
    if (res.ok && res.data) {
      setSelectedProject(res.data.project || res.data);
    } else {
      showToast(res.error || 'Failed to load installation details.', 'error');
    }
    setLoading(false);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomer) {
      showToast('Please select a customer.', 'error');
      return;
    }

    setLoading(true);
    const res = await apiFetch('create_installation', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: formCustomer,
        status: formStatus,
        estimated_completion_date: formEstDate || null,
        internal_notes: formNotes || null,
      })
    });

    if (res.ok) {
      showToast('Project registered successfully.', 'success');
      setScreen('list');
      fetchProjects();
    } else {
      showToast(res.error || 'Failed to register project.', 'error');
    }
    setLoading(false);
  };

  const handleAssignEngineer = async () => {
    if (!selectedId || !assignEngineerId) return;

    const res = await apiFetch('assign_installation_engineer', {
      method: 'POST',
      body: JSON.stringify({
        project_id: selectedId,
        engineer_id: assignEngineerId
      })
    });

    if (res.ok) {
      showToast('Engineer assigned.', 'success');
      viewDetails(selectedId);
    } else {
      showToast(res.error || 'Failed to assign engineer.', 'error');
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    if (!selectedId) return;
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    const res = await apiFetch('update_installation_task', {
      method: 'POST',
      body: JSON.stringify({
        project_id: selectedId,
        task_id: taskId,
        status: nextStatus
      })
    });

    if (res.ok) {
      showToast('Task updated.', 'success');
      viewDetails(selectedId);
    } else {
      showToast(res.error || 'Failed to update task.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    const res = await apiFetch(`delete_installation&id=${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      showToast('Project deleted.', 'success');
      setShowDeleteConfirm(null);
      setScreen('list');
      fetchProjects();
    } else {
      showToast(res.error || 'Failed to delete project.', 'error');
    }
    setLoading(false);
  };

  const calcProgress = (tasksList?: ProjectTask[]) => {
    if (!tasksList || tasksList.length === 0) return 0;
    const completed = tasksList.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasksList.length) * 100);
  };

  return (
    <div className="view-content animate-fade">
      <div className="flex-between" style={{ marginBottom: '12px' }}>
        <button onClick={() => {
          if (screen !== 'list') setScreen('list');
          else if (onBack) onBack();
        }} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0, color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back
        </button>
        {screen === 'list' && (
          <button onClick={() => {
            setFormCustomer(customers[0]?.id || 0);
            setFormEstDate('');
            setFormStatus('lead_received');
            setFormNotes('');
            setScreen('form');
          }} className="btn btn-primary btn-sm">
            <Plus size={14} /> Register Project
          </button>
        )}
      </div>

      {screen === 'list' && (
        <>
          <PageHeader title="Installation Projects" subtitle="Rooftop solar execution pipeline" />

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div className="search-bar" style={{ margin: 0 }}>
              <Search size={15} color="var(--text-muted)" />
              <input 
                type="search" 
                placeholder="Search projects…" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: '12px', height: '40px' }}
            >
              <option value="">All Status</option>
              <option value="lead_received">Lead Received</option>
              <option value="site_survey">Site Survey</option>
              <option value="structure_mounting">Mounting</option>
              <option value="net_metering">Net Metering</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <p>Loading projects...</p>
            </div>
          ) : projects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.map(proj => {
                const progress = calcProgress(proj.tasks);
                return (
                  <div 
                    key={proj.id} 
                    className="card" 
                    onClick={() => viewDetails(proj.id)}
                    style={{ padding: '14px', marginBottom: 0, cursor: 'pointer' }}
                  >
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{proj.customer_name}</h4>
                      <StatusBadge status={proj.status} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div className="progress-bar" style={{ flex: 1 }}>
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>{progress}%</span>
                    </div>

                    <div className="flex-between" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Target: {proj.estimated_completion_date || 'Flexible'}</span>
                      <span>Created: {new Date(proj.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Wrench size={24} color="var(--primary)" />}
              title="No projects found"
              description="No installation projects match your criteria."
            />
          )}
        </>
      )}

      {screen === 'form' && (
        <form onSubmit={handleCreateProject} className="card">
          <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '16px' }}>Register Installation Project</h3>
          
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select 
              className="form-select" 
              value={formCustomer} 
              onChange={e => setFormCustomer(Number(e.target.value))}
              required
            >
              <option value={0}>Select Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Completion Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={formEstDate} 
              onChange={e => setFormEstDate(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Initial Status</label>
            <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
              <option value="lead_received">Lead Received</option>
              <option value="site_survey">Site Survey</option>
              <option value="structure_mounting">Mounting</option>
              <option value="net_metering">Net Metering</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <textarea 
              className="form-textarea" 
              placeholder="Add project specifications or requirements..." 
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)} 
            />
          </div>

          <div className="grid-2" style={{ gap: '10px' }}>
            <button type="button" onClick={() => setScreen('list')} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      )}

      {screen === 'detail' && selectedProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card">
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedProject.customer_name}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Project #{selectedProject.id}</p>
              </div>
              <StatusBadge status={selectedProject.status} />
            </div>

            <div className="info-row">
              <span className="label">Target Completion</span>
              <span className="value">{selectedProject.estimated_completion_date || 'Flexible'}</span>
            </div>
            <div className="info-row">
              <span className="label">Created Date</span>
              <span className="value">{new Date(selectedProject.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="card">
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={15} color="var(--primary)" /> Assigned Engineers
            </h4>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select 
                className="form-select" 
                style={{ flex: 1, fontSize: '12px' }}
                value={assignEngineerId}
                onChange={e => setAssignEngineerId(Number(e.target.value))}
              >
                <option value={0}>Select Engineer</option>
                {engineers.map(eng => (
                  <option key={eng.id} value={eng.id}>{eng.name}</option>
                ))}
              </select>
              <button onClick={handleAssignEngineer} className="btn btn-primary btn-sm">Assign</button>
            </div>

            {selectedProject.assigned_engineers && selectedProject.assigned_engineers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedProject.assigned_engineers.map(eng => (
                  <div key={eng.id} className="info-row" style={{ padding: '6px 0' }}>
                    <span className="value" style={{ fontWeight: 500 }}>{eng.name}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{eng.mobile || eng.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No engineer assigned yet.</p>
            )}
          </div>

          <div className="card">
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardCheck size={15} color="var(--success)" /> Milestones Checklist
            </h4>

            {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedProject.tasks.map(t => (
                  <label key={t.id} className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={t.status === 'completed'} 
                      onChange={() => handleToggleTask(t.id, t.status)} 
                    />
                    <span style={{ fontSize: '13px', textDecoration: t.status === 'completed' ? 'line-through' : 'none', color: t.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {t.title}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No checklist items.</p>
            )}
          </div>

          <button onClick={() => setShowDeleteConfirm(selectedProject.id)} className="btn btn-block" style={{ background: 'var(--error-light)', color: 'var(--error)', fontWeight: 500 }}>
            <Trash2 size={15} /> Delete Project
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <Modal
          isOpen={!!showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete Project?"
          footer={
            <div className="grid-2" style={{ gap: '10px' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn btn-danger">Delete</button>
            </div>
          }
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            This action cannot be undone. The project record will be permanently deleted.
          </p>
        </Modal>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '20px', right: '20px', 
          background: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: '#fff', padding: '12px 16px', borderRadius: '12px', zIndex: 10000,
          boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px',
          animation: 'slide-up 0.3s ease-out'
        }}>
          <CheckCircle2 size={16} />
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
