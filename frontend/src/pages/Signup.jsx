import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { GraduationCap, School } from 'lucide-react';

import api from '@/lib/api';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { FormField } from '@/components/erp/PagePrimitives';



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

    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">

      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

        <div className="border-b border-blue-100 bg-blue-50 px-6 py-5">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">

              <School className="h-5 w-5" />

            </div>

            <div>

              <h1 className="text-xl font-bold text-slate-900">School Sign Up</h1>

              <p className="text-sm text-slate-500">Create your school account</p>

            </div>

          </div>

        </div>



        <div className="p-6">

          <form className="space-y-4" onSubmit={submit}>

            <FormField label="School Name">

              <Input placeholder="School Name" value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} required />

            </FormField>

            <FormField label="Admin Name">

              <Input placeholder="Admin Name" value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} required />

            </FormField>

            <FormField label="Email">

              <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />

            </FormField>

            <FormField label="Phone">

              <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            </FormField>

            <FormField label="Password">

              <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

            </FormField>

            <Button className="w-full" variant="success" disabled={loading}>

              <GraduationCap className="mr-2 h-4 w-4" />

              {loading ? 'Creating...' : 'Create School Account'}

            </Button>

          </form>



          <p className="mt-5 text-center text-sm text-slate-500">

            Already have an account?{' '}

            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">

              Login

            </Link>

          </p>

        </div>

      </div>

    </div>

  );

}

