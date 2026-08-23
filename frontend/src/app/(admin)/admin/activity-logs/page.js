'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';
import { Activity } from 'lucide-react';

export default function ActivityLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/activity-logs');
      if (res.ok) setLogs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.userName.toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.entityName.toLowerCase().includes(search.toLowerCase()) || 
    log.entityType.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <PageHeader eyebrow="System" title="Activity logs" description="Review the audit trail for content and administrative changes." icon={Activity} />

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <input 
          className="input" 
          placeholder="Search activity logs..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ margin: 0, maxWidth: '300px' }}
        />

        {loading ? (
          <p>Loading activity logs...</p>
        ) : filteredLogs.length === 0 ? (
          <p>No activity logs found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity Name</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#90a4ae' }}>{new Date(log.createdAt).toLocaleString()}</span>
                    </td>
                    <td>
                      <b style={{ color: '#fff' }}>{log.userName.split('@')[0]}</b>
                      <br />
                      <small style={{ color: '#90a4ae' }}>{log.userName}</small>
                    </td>
                    <td>
                      <span 
                        style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          background: log.action === 'CREATE' ? 'rgba(76, 175, 80, 0.15)' : log.action === 'UPDATE' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(244, 67, 54, 0.15)',
                          color: log.action === 'CREATE' ? '#81c784' : log.action === 'UPDATE' ? '#64b5f6' : '#e57373'
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#90a4ae' }}>
                        {log.entityType}
                      </span>
                    </td>
                    <td><strong style={{ color: '#fff' }}>{log.entityName}</strong></td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.ipAddress || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
