'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { Download, Inbox as InboxIcon, Eye, Trash2 } from 'lucide-react';

const inboxKinds = [
  { key: 'contacts', label: 'Contact Enquiries' },
  { key: 'reservations', label: 'Reservations' },
  { key: 'orders', label: 'Orders' },
  { key: 'guest-list', label: 'Guest List' }
];

function InboxViewer() {
  const confirmAction = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const kind = searchParams.get('kind') || 'contacts';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/admin/${kind}`);
      if (res.ok) {
        setRows(await res.json());
      } else {
        setError('Could not load data.');
      }
    } catch {
      setError('Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    setSelectedItem(null);
  }, [kind]);

  const deleteItem = async (id) => {
    if (!await confirmAction({ title: 'Delete submission?', description: 'This submission will be permanently deleted and cannot be recovered.', confirmLabel: 'Delete submission', tone: 'danger' })) return;
    try {
      const res = await api(`/admin/${kind}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRows(rows.filter(item => item.id !== id));
        setSelectedItem(null);
      } else {
        alert('Could not delete item.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (item, newStatus) => {
    try {
      const method = kind === 'orders' ? 'PATCH' : 'PUT';
      const res = await api(`/admin/${kind}/${item.id}/status`, {
        method,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        // Update local state
        setRows(rows.map(r => r.id === item.id 
          ? { ...r, status: newStatus } 
          : r
        ));
        setSelectedItem(prev => prev && prev.id === item.id 
          ? { ...prev, status: newStatus } 
          : prev
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // CSV Export utility
  const exportToCSV = () => {
    if (rows.length === 0) return alert('No data to export.');
    
    // Get headers from first row keys
    const headers = Object.keys(rows[0]).filter(k => k !== 'id' && k !== 'legacyId');
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of rows) {
      const values = headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') val = JSON.stringify(val);
        // Escape quotes
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      csvRows.push(values.join(','));
    }
    
    // Download trigger
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `preva-${kind}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = rows.filter((row) => {
    const term = search.toLowerCase();
    // Dynamically search in any string field
    return Object.values(row).some(val => 
      val && String(val).toLowerCase().includes(term)
    );
  });

  return (
    <Shell>
      <PageHeader eyebrow="Engagement" title={inboxKinds.find((item) => item.key === kind)?.label || 'Inbox'} description="Review and manage customer submissions in one place." icon={InboxIcon} actions={<button className="btn btn-secondary" onClick={exportToCSV}><Download size={15} /> Export CSV</button>} />
      <div className="segmented-tabs">
        {inboxKinds.map((item) => (
            <a 
              key={item.key} 
              className={`btn ${item.key === kind ? '' : 'inactive-kind'}`} 
              href={`/admin/inbox?kind=${item.key}`} 
            >
              {item.label}
            </a>
          ))}
      </div>

      {error && <div className="error" style={{ marginBottom: '24px' }}>{error}</div>}

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          className="input" 
          placeholder={`Search in ${kind.replace('-', ' ')}...`} 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ margin: 0, maxWidth: '300px' }}
        />

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : filteredRows.length === 0 ? (
          <EmptyState icon={InboxIcon} title="No submissions found" description="New customer enquiries will appear here." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  {kind === 'contacts' && (
                    <>
                      <th>Name</th>
                      <th>Email / Phone</th>
                      <th>Inquiry</th>
                      <th>Status</th>
                    </>
                  )}
                  {kind === 'reservations' && (
                    <>
                      <th>Name</th>
                      <th>Guests</th>
                      <th>Occasion</th>
                      <th>Booking Date</th>
                      <th>Status</th>
                    </>
                  )}
                  {kind === 'orders' && (
                    <>
                      <th>Order #</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Total</th>
                      <th>Status</th>
                    </>
                  )}
                  {kind === 'guest-list' && (
                    <>
                      <th>Name</th>
                      <th>Email / Phone</th>
                      <th>Event</th>
                      <th>Source</th>
                    </>
                  )}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontSize: '0.85rem', color: '#90a4ae' }}>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                    {/* Contacts Specific Layout */}
                    {kind === 'contacts' && (
                      <>
                        <td><b style={{ color: '#fff' }}>{row.firstName} {row.lastName}</b></td>
                        <td>
                          <span>{row.email}</span>
                          <br />
                          <small style={{ color: '#90a4ae' }}>{row.phone}</small>
                        </td>
                        <td><span style={{ textTransform: 'capitalize' }}>{row.inquiry}</span></td>
                        <td>
                          <span className={`badge ${row.status === 'new' ? 'badge-draft' : 'badge-published'}`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Reservations Specific Layout */}
                    {kind === 'reservations' && (
                      <>
                        <td><b style={{ color: '#fff' }}>{row.fullName}</b><br /><small style={{ color: '#90a4ae' }}>{row.email} • {row.mobile}</small></td>
                        <td><b>{row.guests}</b></td>
                        <td>{row.occasion || '—'}</td>
                        <td>{new Date(row.reservationDate).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${row.status === 'pending' ? 'badge-draft' : 'badge-published'}`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Orders Specific Layout */}
                    {kind === 'orders' && (
                      <>
                        <td><b style={{ color: '#fff' }}>{row.orderNumber}</b></td>
                        <td><b style={{ color: '#fff' }}>{row.customer?.name}</b><br /><small style={{ color: '#90a4ae' }}>{row.customer?.phone}</small></td>
                        <td><span style={{ textTransform: 'uppercase' }}>{row.fulfilment || '—'}</span></td>
                        <td><strong style={{ color: '#c5a059' }}>${((row.totalCents || 0) / 100).toFixed(2)}</strong></td>
                        <td>
                          <span className={`badge ${row.status === 'PENDING' ? 'badge-draft' : 'badge-published'}`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Guest List Specific Layout */}
                    {kind === 'guest-list' && (
                      <>
                        <td><b style={{ color: '#fff' }}>{row.fullName}</b></td>
                        <td><span>{row.email}</span><br /><small style={{ color: '#90a4ae' }}>{row.phone}</small></td>
                        <td>{row.eventName || 'General Vibe'}</td>
                        <td>{row.source || 'website'}</td>
                      </>
                    )}

                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn btn-secondary" title="View details" onClick={() => setSelectedItem(row)}><Eye size={14} /></button>
                        <button type="button" className="btn btn-danger" title="Delete" onClick={() => deleteItem(row.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Dialog Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Submission Details</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#cfd8dc', fontSize: '0.95rem' }}>
              {Object.entries(selectedItem).map(([key, val]) => {
                if (key === 'id' || key === 'legacyId') return null;
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', color: '#90a4ae', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</span>
                    <span style={{ color: '#fff', wordBreak: 'break-all' }}>
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Status controls inside view dialog */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '24px', justifyContent: 'flex-end' }}>
              {kind === 'contacts' && selectedItem.status === 'new' && (
                <button type="button" className="btn" onClick={() => updateStatus(selectedItem, 'read')}>Mark as Read</button>
              )}
              {kind === 'reservations' && selectedItem.status === 'pending' && (
                <>
                  <button type="button" className="btn" onClick={() => updateStatus(selectedItem, 'confirmed')}>Approve Booking</button>
                  <button type="button" className="btn btn-danger" onClick={() => updateStatus(selectedItem, 'cancelled')}>Cancel Booking</button>
                </>
              )}
              {kind === 'orders' && ['PAID', 'RECEIVED'].includes(selectedItem.status) && (
                <button type="button" className="btn" onClick={() => updateStatus(selectedItem, 'PREPARING')}>Start Preparing</button>
              )}
              <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => setSelectedItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function Inbox() {
  return (
    <Suspense fallback={<p style={{ color: '#aaa', padding: '20px' }}>Loading inbox...</p>}>
      <InboxViewer />
    </Suspense>
  );
}
