'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';
import { Activity, BookOpen, FilePlus2, FileText, FolderTree, Images, Inbox, ListTree, Plus, ShoppingCart, Sparkles, Users } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api('/admin/dashboard')
      .then((res) => {
        if (!res.ok) {
          setError('Failed to fetch dashboard statistics.');
          setLoading(false);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not connect to API server.');
        setLoading(false);
      });
  }, []);

  return (
    <Shell>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Monitor content performance and manage your publishing workspace."
        icon={Activity}
        actions={
          <>
            <a className="btn btn-secondary" href="/admin/content/edit?type=PAGE"><FilePlus2 size={15} /> New page</a>
            <a className="btn" href="/admin/content/edit?type=POST"><Plus size={15} /> New post</a>
          </>
        }
      />

      {error && <div className="error" style={{ marginBottom: '24px' }}>{error}</div>}

      {loading ? (
        <LoadingSkeleton cards rows={5} />
      ) : stats ? (
        <>
          <div className="cards">
            <StatsCard label="Online Orders" value={stats.activeOrders ?? stats.counts?.openOrders ?? 0} helper={`${stats.totalOrders ?? 0} all-time orders`} icon={ShoppingCart} tone="warning" href="/admin/orders" />
            <StatsCard label="Reservations" value={stats.newReservations ?? stats.counts?.newReservations ?? 0} helper="New booking requests" icon={ListTree} tone="info" href="/admin/inbox?kind=reservations" />
            <StatsCard label="Total posts" value={stats.posts} helper={`${stats.publishedPosts} published · ${stats.draftPosts} drafts`} icon={BookOpen} href="/admin/content?type=POST" />
            <StatsCard label="Pages" value={stats.pages} helper="Published site pages" icon={FileText} tone="info" href="/admin/content?type=PAGE" />
            <StatsCard label="Categories" value={stats.categories} helper="Content collections" icon={FolderTree} tone="warning" href="/admin/categories" />
            <StatsCard label="Media" value={stats.galleryImages} helper="Library assets" icon={Images} tone="success" href="/admin/media" />
            <StatsCard label="Users" value={stats.users} helper="Workspace members" icon={Users} tone="info" href="/admin/users" />
            <StatsCard label="Enquiries" value={stats.enquiries} helper={`${stats.unreadEnquiries} unread`} icon={Inbox} tone="warning" href="/admin/inbox?kind=contacts" />
            <StatsCard label="Services" value={stats.services} helper="Managed experiences" icon={Sparkles} tone="success" href="/admin/services" />
          </div>

          <div className="dashboard-grids">
            {/* Live Recent Orders Panel */}
            <div className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent Orders</h3>
                  <p>Live food & kitchen orders</p>
                </div>
                <a href="/admin/orders">View all orders</a>
              </div>
              {stats.recentOrders && stats.recentOrders.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((ord) => (
                        <tr key={ord.id || ord.orderNumber}>
                          <td>
                            <a href="/admin/orders" style={{ color: '#F5DF97', textDecoration: 'none', fontWeight: 'bold' }}>
                              #{ord.orderNumber}
                            </a>
                          </td>
                          <td>
                            <strong>{ord.customer?.name || 'Customer'}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#888' }}>{ord.fulfilment || 'PICKUP'}</div>
                          </td>
                          <td>
                            <StatusBadge status={ord.status} />
                          </td>
                          <td style={{ fontWeight: '700', color: '#ddd' }}>
                            ${((ord.totalCents || 0) / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={ShoppingCart} title="No orders yet" description="Incoming kitchen orders will appear here in real-time." />
              )}
            </div>

            {/* Recent Posts Panel */}
            <div className="panel">
              <div className="panel-heading"><div><h3>Recent posts</h3><p>Latest content updates</p></div><a href="/admin/content?type=POST">View all</a></div>
              {stats.recentPosts && stats.recentPosts.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentPosts.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <a href={`/admin/content/edit?id=${p.id}&type=POST`} style={{ color: '#78b4ff', textDecoration: 'none', fontWeight: 'bold' }}>{p.title}</a>
                          </td>
                          <td>
                            <StatusBadge status={p.status} />
                          </td>
                          <td style={{ fontSize: '0.85rem', color: '#90a4ae' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState icon={BookOpen} title="No posts yet" description="Create your first post to start publishing." />
              )}
            </div>

            {/* Recent Activity Log Panel */}
            <div className="panel">
              <div className="panel-heading"><div><h3>Recent activity</h3><p>Latest workspace changes</p></div><a href="/admin/activity-logs">View log</a></div>
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="activity-feed">
                  {stats.recentActivity.map((log) => (
                    <div key={log.id} className="activity-item">
                      <div className="activity-mark"><Activity size={14} /></div>
                      <div className="activity-copy">
                        <div><strong>{log.userName.split('@')[0]}</strong><span>{log.action.toLowerCase()}</span><b>{log.entityName}</b></div>
                        <small>{log.entityType} · {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Activity} title="No activity yet" description="Workspace changes will appear here." />
              )}
            </div>

            <div className="panel">
              <div className="panel-heading"><div><h3>Recent enquiries</h3><p>Latest website form submissions</p></div><a href="/admin/inbox?kind=contacts">Open inbox</a></div>
              {stats.recentEnquiries?.length ? <div className="activity-feed">{stats.recentEnquiries.map((item) => <div className="activity-item" key={item.id}><div className="activity-mark"><Inbox size={14} /></div><div className="activity-copy"><div><strong>{item.firstName || item.name || item.email}</strong><span>{item.formSource || item.inquiry || 'contact form'}</span></div><small>{item.email} · {new Date(item.createdAt).toLocaleString()}</small></div><StatusBadge status={item.status || 'new'} /></div>)}</div> : <EmptyState icon={Inbox} title="No enquiries yet" description="New website submissions will appear here." />}
            </div>
          </div>
        </>
      ) : null}
    </Shell>
  );
}
