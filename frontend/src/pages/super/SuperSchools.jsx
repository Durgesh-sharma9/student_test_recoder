import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { formatDisplayDate } from '@/lib/dateFormatter';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperSchools() {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const load = async () => {
    const params = {};
    if (search) params.search = search;
    if (status !== 'all') params.status = status;
    const res = await api.get('/super-admin/schools', { params });
    setSchools(res.data.schools || []);
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (id, isActive) => {
    await api.patch(`/super-admin/schools/${id}/status`, { isActive });
    toast.success(isActive ? 'School activated' : 'School deactivated');
    load();
  };

  return (
    <PageStack>
      <PageHeader
        title="School Management"
        description="Search, filter, and manage all registered schools on the platform."
      />

      <ErpSection title="Search & Filter" icon={Search} tone="blue">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Search schools" className="min-w-[200px] flex-1">
            <Input
              className="max-w-xs"
              placeholder="Search schools"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FormField>
          <FormField label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <Button onClick={load}>Search</Button>
        </div>
      </ErpSection>

      <ErpSection title="All Schools" icon={Building2} tone="green">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.schoolName}</TableCell>
                  <TableCell>
                    {s.adminName}
                    <br />
                    <span className="text-xs text-slate-500">{s.email}</span>
                  </TableCell>
                  <TableCell>{s.plan?.name || '-'}</TableCell>
                  <TableCell>{s.planExpiresAt ? formatDisplayDate(s.planExpiresAt) : '-'}</TableCell>
                  <TableCell>
                    {s.isExpired ? (
                      <span className="font-medium text-amber-600">Expired</span>
                    ) : s.isActive ? (
                      'Active'
                    ) : (
                      'Inactive'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/super-admin/schools/${s._id}`}>View</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(s._id, !s.isActive)}>
                        {s.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ErpSection>
    </PageStack>
  );
}
