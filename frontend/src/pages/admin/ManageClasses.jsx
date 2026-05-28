import { useEffect, useState } from 'react';

import {
  Plus,
  Pencil,
  Trash2,
  School2,
  Search,
  Layers3,
} from 'lucide-react';

import { toast } from 'sonner';

import api from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ManageClasses() {

  const [rows, setRows] = useState([]);

  const [open, setOpen] = useState(false);

  const [edit, setEdit] = useState(null);

  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    className: '',
    section: '',
    academicYear: '',
  });

  const fetchData = async () => {

    const res = await api.get('/classes');

    setRows(res.data.classes || []);
  };

  useEffect(() => {

    fetchData();

  }, []);

  const submit = async (e) => {

    e.preventDefault();

    try {

      const payload = {
        ...form,
        className: form.className.toUpperCase(),
      };

      if (edit) {

        await api.put(
          `/classes/${edit._id}`,
          payload
        );

      } else {

        await api.post(
          '/classes',
          payload
        );
      }

      toast.success(
        edit
          ? 'Class updated'
          : 'Class created'
      );

      setOpen(false);

      setEdit(null);

      setForm({
        className: '',
        section: '',
        academicYear: '',
      });

      fetchData();

    } catch (err) {

      toast.error(
        err.response?.data?.message || 'Failed'
      );
    }
  };

  const filteredRows = rows.filter((c) => {

    return (
      c.className
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      c.section
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||

      c.academicYear
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *{
          box-sizing:border-box;
        }

        .manage-page{
          font-family:'Inter',sans-serif;
        }

        /* ======================
           HEADER
        ====================== */

        .page-header{
          display:flex;
          align-items:center;
          justify-content:space-between;

          gap:16px;

          margin-bottom:22px;

          flex-wrap:wrap;
        }

        .page-title{
          font-size:30px;
          font-weight:800;

          color:#111827;

          letter-spacing:-1px;
        }

        .page-subtitle{
          font-size:13px;
          color:#6b7280;

          margin-top:4px;
        }

        .add-btn{
          height:48px;

          padding:0 20px;

          border:none;

          border-radius:16px;

          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #7c3aed
            );

          color:white;

          display:flex;
          align-items:center;
          gap:10px;

          font-size:14px;
          font-weight:700;

          cursor:pointer;

          box-shadow:
            0 10px 24px rgba(79,70,229,0.18);

          transition:0.2s ease;
        }

        .add-btn:hover{
          transform:translateY(-2px);
        }

        /* ======================
           TOP STATS
        ====================== */

        .top-grid{
          display:grid;

          grid-template-columns:
            repeat(auto-fit,minmax(220px,1fr));

          gap:16px;

          margin-bottom:18px;
        }

        .stat-card{
          background:white;

          border-radius:20px;

          border:1px solid #eceff3;

          padding:20px;

          box-shadow:
            0 2px 10px rgba(0,0,0,0.03);
        }

        .stat-top{
          display:flex;
          align-items:center;
          justify-content:space-between;

          margin-bottom:16px;
        }

        .stat-title{
          font-size:13px;
          font-weight:600;

          color:#6b7280;
        }

        .stat-icon{
          width:44px;
          height:44px;

          border-radius:14px;

          display:flex;
          align-items:center;
          justify-content:center;
        }

        .stat-value{
          font-size:34px;
          font-weight:800;

          color:#111827;
        }

        /* ======================
           TABLE CARD
        ====================== */

        .table-card{
          background:white;

          border-radius:22px;

          border:1px solid #eceff3;

          overflow:hidden;

          box-shadow:
            0 2px 10px rgba(0,0,0,0.03);
        }

        .table-header{
          padding:18px 20px;

          border-bottom:1px solid #f3f4f6;

          display:flex;
          align-items:center;
          justify-content:space-between;

          gap:14px;

          flex-wrap:wrap;
        }

        .table-title{
          font-size:18px;
          font-weight:700;

          color:#111827;
        }

        .search-box{
          position:relative;

          width:280px;

          max-width:100%;
        }

        .search-icon{
          position:absolute;

          left:14px;
          top:50%;

          transform:translateY(-50%);

          color:#9ca3af;
        }

        .search-input{
          width:100%;

          height:46px;

          border-radius:14px;

          border:1px solid #e5e7eb;

          background:#f9fafb;

          padding:0 14px 0 42px;

          font-size:14px;

          outline:none;

          transition:0.2s ease;
        }

        .search-input:focus{
          border-color:#4f46e5;

          background:white;

          box-shadow:
            0 0 0 4px rgba(79,70,229,0.08);
        }

        /* ======================
           TABLE
        ====================== */

        .table-wrap{
          overflow-x:auto;
        }

        table{
          width:100%;

          border-collapse:collapse;
        }

        thead{
          background:#f9fafb;
        }

        th{
          text-align:left;

          padding:16px 20px;

          font-size:12px;

          color:#6b7280;

          font-weight:700;

          text-transform:uppercase;

          letter-spacing:0.5px;
        }

        td{
          padding:18px 20px;

          border-top:1px solid #f3f4f6;

          font-size:14px;

          color:#111827;

          font-weight:500;
        }

        tr:hover{
          background:#fafafa;
        }

        .class-badge{
          display:inline-flex;
          align-items:center;
          gap:8px;

          padding:8px 12px;

          border-radius:999px;

          background:#eef2ff;

          color:#4f46e5;

          font-size:13px;
          font-weight:700;
        }

        .year-badge{
          padding:7px 12px;

          border-radius:999px;

          background:#ecfdf5;

          color:#10b981;

          font-size:12px;
          font-weight:700;
        }

        .actions{
          display:flex;
          align-items:center;
          gap:10px;
        }

        .icon-btn{
          width:38px;
          height:38px;

          border:none;

          border-radius:12px;

          display:flex;
          align-items:center;
          justify-content:center;

          cursor:pointer;

          transition:0.2s ease;
        }

        .edit-btn{
          background:#eef2ff;
          color:#4f46e5;
        }

        .delete-btn{
          background:#fee2e2;
          color:#ef4444;
        }

        .icon-btn:hover{
          transform:translateY(-2px);
        }

        /* ======================
           DIALOG
        ====================== */

        .dialog-form{
          display:flex;
          flex-direction:column;
          gap:16px;

          margin-top:12px;
        }

        .field{
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .field label{
          font-size:13px;
          font-weight:600;

          color:#374151;
        }

        .custom-input{
          height:48px;

          border-radius:14px;

          border:1px solid #e5e7eb;

          background:#f9fafb;

          padding:0 14px;

          font-size:14px;

          outline:none;

          transition:0.2s ease;
        }

        .custom-input:focus{
          border-color:#4f46e5;

          background:white;

          box-shadow:
            0 0 0 4px rgba(79,70,229,0.08);
        }

        .submit-btn{
          height:50px;

          border:none;

          border-radius:16px;

          background:
            linear-gradient(
              135deg,
              #4f46e5,
              #7c3aed
            );

          color:white;

          font-size:14px;
          font-weight:700;

          cursor:pointer;

          margin-top:6px;

          transition:0.2s ease;
        }

        .submit-btn:hover{
          transform:translateY(-2px);
        }

        /* ======================
           MOBILE
        ====================== */

        @media(max-width:768px){

          .page-title{
            font-size:24px;
          }

          th,
          td{
            padding:14px;
          }

          .table-header{
            padding:16px;
          }
        }
      `}</style>

      <div className="manage-page">

        {/* HEADER */}

        <div className="page-header">

          <div>

            <div className="page-title">
              Class Management
            </div>

            <div className="page-subtitle">
              Manage all academic classes and sections
            </div>

          </div>

          <button
            className="add-btn"
            onClick={() => {
              setEdit(null);

              setForm({
                className:'',
                section:'',
                academicYear:'',
              });

              setOpen(true);
            }}
          >

            <Plus size={18} />

            Add Class

          </button>

        </div>

        {/* TOP GRID */}

        <div className="top-grid">

          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-title">
                Total Classes
              </div>

              <div
                className="stat-icon"
                style={{
                  background:'#eef2ff',
                }}
              >
                <School2
                  size={22}
                  color="#4f46e5"
                />
              </div>

            </div>

            <div className="stat-value">
              {rows.length}
            </div>

          </div>

          <div className="stat-card">

            <div className="stat-top">

              <div className="stat-title">
                Sections
              </div>

              <div
                className="stat-icon"
                style={{
                  background:'#ecfdf5',
                }}
              >
                <Layers3
                  size={22}
                  color="#10b981"
                />
              </div>

            </div>

            <div className="stat-value">
              {
                new Set(
                  rows.map((r)=>r.section)
                ).size
              }
            </div>

          </div>

        </div>

        {/* TABLE */}

        <div className="table-card">

          <div className="table-header">

            <div className="table-title">
              Class Records
            </div>

            <div className="search-box">

              <div className="search-icon">
                <Search size={16} />
              </div>

              <input
                type="text"
                placeholder="Search classes..."
                className="search-input"
                value={search}
                onChange={(e)=>
                  setSearch(e.target.value)
                }
              />

            </div>

          </div>

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Class</th>

                  <th>Section</th>

                  <th>Academic Year</th>

                  <th>Actions</th>

                </tr>

              </thead>

              <tbody>

                {filteredRows.map((c)=>(

                  <tr key={c._id}>

                    <td>

                      <div className="class-badge">

                        <School2 size={14} />

                        {c.className}

                      </div>

                    </td>

                    <td>
                      {c.section}
                    </td>

                    <td>

                      <span className="year-badge">
                        {c.academicYear}
                      </span>

                    </td>

                    <td>

                      <div className="actions">

                        <button
                          className="icon-btn edit-btn"
                          onClick={() => {

                            setEdit(c);

                            setForm({
                              className:c.className,
                              section:c.section,
                              academicYear:c.academicYear,
                            });

                            setOpen(true);
                          }}
                        >

                          <Pencil size={16} />

                        </button>

                        <button
                          className="icon-btn delete-btn"
                          onClick={async () => {

                            await api.delete(
                              `/classes/${c._id}`
                            );

                            toast.success(
                              'Deleted successfully'
                            );

                            fetchData();
                          }}
                        >

                          <Trash2 size={16} />

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

        {/* DIALOG */}

        <Dialog
          open={open}
          onOpenChange={setOpen}
        >

          <DialogContent
            className="rounded-[24px]"
          >

            <DialogHeader>

              <DialogTitle
                className="text-[22px] font-bold"
              >

                {edit
                  ? 'Edit Class'
                  : 'Add New Class'}

              </DialogTitle>

            </DialogHeader>

            <form
              className="dialog-form"
              onSubmit={submit}
            >

              <div className="field">

                <label>
                  Class Name
                </label>

                <input
                  type="text"
                  className="custom-input"
                  placeholder="Enter class name"
                  value={form.className}
                  onChange={(e)=>
                    setForm({
                      ...form,
                      className:
                        e.target.value.toUpperCase(),
                    })
                  }
                  required
                />

              </div>

              <div className="field">

                <label>
                  Section
                </label>

                <input
                  type="text"
                  className="custom-input"
                  placeholder="Enter section"
                  value={form.section}
                  onChange={(e)=>
                    setForm({
                      ...form,
                      section:e.target.value,
                    })
                  }
                  required
                />

              </div>

              <div className="field">

                <label>
                  Academic Year
                </label>

                <input
                  type="text"
                  className="custom-input"
                  placeholder="2025-26"
                  value={form.academicYear}
                  onChange={(e)=>
                    setForm({
                      ...form,
                      academicYear:e.target.value,
                    })
                  }
                  required
                />

              </div>

              <button
                type="submit"
                className="submit-btn"
              >

                {edit
                  ? 'Update Class'
                  : 'Create Class'}

              </button>

            </form>

          </DialogContent>

        </Dialog>

      </div>
    </>
  );
}