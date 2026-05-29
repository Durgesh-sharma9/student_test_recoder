import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Signup() {
  const [form, setForm] = useState({ schoolName: '', adminName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register-school', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('School registered successfully');
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>School Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <Input placeholder="School Name" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />
            <Input placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Button className="w-full" disabled={loading}>{loading ? 'Creating...' : 'Create School Account'}</Button>
          </form>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            Already have an account? <Link to="/login" className="text-primary">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
