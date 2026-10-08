'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api, getUser } from '@/lib/admin-api';
import { Users as UsersIcon, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

export default function UsersManager() {
  const confirmAction = useConfirm();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add User Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [status, setStatus] = useState('ACTIVE');
  const [showPassword, setShowPassword] = useState(false);
  
  // Editing User States
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState(''); // Optional password reset
  const [editRole, setEditRole] = useState('EDITOR');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [showEditPassword, setShowEditPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUser().then(setCurrentUser);
    fetchUsers();
  }, []);

  const canAssignSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const createUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role, status })
      });
      if (res.ok) {
        setName('');
        setEmail('');
        setPassword('');
        setRole('EDITOR');
        setStatus('ACTIVE');
        fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not create user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditRole(user.role || 'EDITOR');
    setEditStatus(user.status || 'ACTIVE');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await api(`/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword, // empty string will skip bcrypt update on backend
          role: editRole,
          status: editStatus
        })
      });
      if (res.ok) {
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not update user details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (user) => {
    if (!await confirmAction({ title: 'Delete user account?', description: `“${user.name}” will permanently lose access to the workspace.`, confirmLabel: 'Delete user', tone: 'danger' })) return;
    try {
      const res = await api(`/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not delete user.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <PageHeader eyebrow="Workspace" title="Users & Roles" description="Create team accounts and control exactly what each person can manage." icon={UsersIcon} />

      <div className="role-guide-grid" aria-label="Role permission guide">
        <div className="role-guide-card">
          <strong>Admin</strong>
          <span>Manages content, website settings, orders, careers and team accounts.</span>
        </div>
        <div className="role-guide-card">
          <strong>Editor</strong>
          <span>Creates, edits and publishes posts/pages; also manages media, categories and tags.</span>
        </div>
        <div className="role-guide-card">
          <strong>Author</strong>
          <span>Writes and publishes their own posts, without access to other authors or site settings.</span>
        </div>
        <div className="role-guide-card">
          <strong>Careers Manager</strong>
          <span>Only sees the Hiring Dashboard, career jobs, applications and their own profile.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="editor-layout">
        {/* Left column: Add User Form */}
        <form className="panel" onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Add New User</h3>
          
          <label>Full Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. John Doe" />

          <label>Email Address</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. john@prevakitchen.com" />

          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            placeholder="At least 12 characters"
              style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: '10px', top: '50%',
                transform: 'translateY(-50%)', background: 'none',
                border: 'none', cursor: 'pointer', color: '#90a4ae',
                padding: 0, display: 'flex', alignItems: 'center'
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <label>Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            {canAssignSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
            <option value="AUTHOR">Author</option>
            <option value="CAREERS_MANAGER">Careers Manager (careers only)</option>
          </select>

          <label>Account Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Disabled</option>
          </select>

          <button className="btn" type="submit" style={{ marginTop: '10px' }}>Register User</button>
        </form>

        {/* Right column: Users List Table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            className="input" 
            placeholder="Search users by name or email..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ margin: 0, maxWidth: '300px' }}
          />

          {loading ? (
            <p>Loading users list...</p>
          ) : filteredUsers.length === 0 ? (
            <p>No user accounts found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <b style={{ color: '#fff' }}>{u.name}</b>
                        <br />
                        <span style={{ fontSize: '0.85rem', color: '#90a4ae' }}>{u.email}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '4px', color: '#fff', textTransform: 'uppercase' }}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === 'ACTIVE' ? 'badge-published' : 'badge-trash'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#90a4ae' }}>
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : <span style={{ color: '#666' }}>Never logged in</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => startEdit(u)} title="Edit user"><Edit size={14} /></button>
                          <button type="button" className="btn btn-danger" onClick={() => deleteUser(u)} title="Delete user"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Editing Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Edit User Settings</h3>
            
            <label>Full Name</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />

            <label>Email Address</label>
            <input className="input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />

            <label>Reset Password (leave empty to keep current)</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showEditPassword ? 'text' : 'password'}
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Type new password if changing"
                style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(v => !v)}
                style={{
                  position: 'absolute', right: '10px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#90a4ae',
                  padding: 0, display: 'flex', alignItems: 'center'
                }}
                title={showEditPassword ? 'Hide password' : 'Show password'}
              >
                {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label>Role</label>
            <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
              {canAssignSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
              <option value="ADMIN">Admin</option>
              <option value="EDITOR">Editor</option>
              <option value="AUTHOR">Author</option>
              <option value="CAREERS_MANAGER">Careers Manager (careers only)</option>
            </select>

            <label>Account Status</label>
            <select className="input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn" type="submit">Save Changes</button>
              <button className="btn" type="button" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => setEditingUser(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </Shell>
  );
}
