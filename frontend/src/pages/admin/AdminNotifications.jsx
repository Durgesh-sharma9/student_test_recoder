import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      // Admin ke liye hum saari notifications dikha sakte hain jo usse related hain
      setNotifications(res.data.notifications || []);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  return (
    <PageStack>
      <PageHeader title="School Notifications" description="Manage all school-related updates and alerts." />
      <ErpSection title="Inbox" icon={Bell}>
        {loading ? <p>Loading...</p> : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n._id} className="border p-4 rounded-lg flex justify-between items-center bg-white">
                <div>
                  <h4 className="font-semibold">{n.title}</h4>
                  <p className="text-sm text-slate-600">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ErpSection>
    </PageStack>
  );
}