import { useState, useEffect } from 'react';
import { Megaphone, Paperclip, Users, GraduationCap, Plus, Trash2, CalendarClock, BarChart3, Circle, CheckCircle2, Clock3, RefreshCw, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { FormField } from '@/components/erp/PagePrimitives';

const defaultAnnouncementForm = { title: '', message: '', priority: 'normal' };
const defaultPollForm = {
  title: '',
  description: '',
  audience: 'teachers',
  audienceScope: 'all',
  pollType: 'single',
  allowEdit: false,
  expiryDate: '',
};

export default function AnnouncementModal({ open, onOpenChange, role }) {
  const [activeTab, setActiveTab] = useState('announcement');
  const [formData, setFormData] = useState(defaultAnnouncementForm);
  const [recipientType, setRecipientType] = useState('all');
  const [targetRole, setTargetRole] = useState('teacher');
  const [recipients, setRecipients] = useState([]);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [pollForm, setPollForm] = useState(defaultPollForm);
  const [pollOptions, setPollOptions] = useState([{ text: '' }, { text: '' }]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [polls, setPolls] = useState([]);
  const [pollsLoading, setPollsLoading] = useState(false);
  const [pollSaving, setPollSaving] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollAttachmentFile, setPollAttachmentFile] = useState(null);
  const [pollFilter, setPollFilter] = useState('all');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    if (open) {
      setFormData(defaultAnnouncementForm);
      setRecipientType('all');
      setTargetRole('teacher');
      setSelectedRecipients([]);
      setSelectedClass('');
      setAttachmentFile(null);
      setActiveTab('announcement');
      setPollForm(defaultPollForm);
      setPollOptions([{ text: '' }, { text: '' }]);
      setSelectedClassIds([]);
      setPollAttachmentFile(null);
      setSelectedPoll(null);

      if (role === 'super_admin') {
        api.get('/users?role=school_admin').then((res) => {
          setRecipients(res.data.users || []);
        });
      } else if (role === 'school_admin') {
        api.get('/users?role=teacher').then((res) => {
          setRecipients(res.data.users || []);
        });
        api.get('/classes').then((res) => {
          setClasses(res.data.classes || []);
        });
      }
    }
  }, [open, role]);

  useEffect(() => {
    if (!open || role !== 'school_admin' || activeTab !== 'poll') return;

    fetchPolls();
    const intervalId = window.setInterval(() => {
      fetchPolls();
      if (selectedPoll) {
        loadPollAnalytics(selectedPoll, false);
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [open, role, activeTab, selectedPoll?._id]);

  const fetchPolls = async () => {
    try {
      setPollsLoading(true);
      const res = await api.get('/polls');
      setPolls(res.data.polls || []);
    } catch (error) {
      console.error('Failed to load polls:', error);
      toast.error('Failed to load polls');
    } finally {
      setPollsLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      if (!formData.title || !formData.message) {
        toast.error('Please fill in all required fields');
        return;
      }

      setLoading(true);

      let finalRecipientIds = [];
      let isBroadcast = false;
      let finalTargetRole = targetRole;
      let finalClassId = selectedClass;

      if (role === 'super_admin') {
        finalRecipientIds = recipients.map((r) => r._id);
        isBroadcast = true;
        finalTargetRole = 'school_admin';
      } else if (role === 'school_admin') {
        if (targetRole === 'parent') {
          if (recipientType === 'all') {
            isBroadcast = true;
          } else if (selectedClass) {
            finalClassId = selectedClass;
            isBroadcast = false;
          } else {
            toast.error('Please select a class for class-wise parent notifications');
            setLoading(false);
            return;
          }
        } else {
          if (recipientType === 'all') {
            finalRecipientIds = recipients.map((r) => r._id);
            isBroadcast = true;
          } else {
            finalRecipientIds = selectedRecipients;
            isBroadcast = false;
          }
        }
      }

      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('message', formData.message);
      formDataObj.append('priority', formData.priority);
      formDataObj.append('targetRole', finalTargetRole);
      formDataObj.append('isBroadcast', isBroadcast);

      if (finalClassId) {
        formDataObj.append('classId', finalClassId);
      }

      if (finalRecipientIds.length > 0) {
        formDataObj.append('recipientIds', JSON.stringify(finalRecipientIds));
      }

      if (attachmentFile) {
        formDataObj.append('attachment', attachmentFile);
      }

      await api.post('/notifications', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onOpenChange(false);
      toast.success('Announcement sent successfully');
    } catch (error) {
      console.error('Failed to send announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to send announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipientToggle = (recipientId) => {
    setSelectedRecipients((prev) => {
      if (prev.includes(recipientId)) {
        return prev.filter((id) => id !== recipientId);
      }
      return [...prev, recipientId];
    });
  };

  const handlePollOptionChange = (index, value) => {
    const updated = [...pollOptions];
    updated[index] = { ...updated[index], text: value };
    setPollOptions(updated);
  };

  const addPollOption = () => {
    if (pollOptions.length >= 10) {
      toast.error('Maximum 10 options allowed');
      return;
    }
    setPollOptions([...pollOptions, { text: '' }]);
  };

  const removePollOption = (index) => {
    if (pollOptions.length <= 2) {
      toast.error('Minimum 2 options are required');
      return;
    }
    setPollOptions(pollOptions.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreatePoll = async () => {
    try {
      if (!pollForm.title || !pollForm.description) {
        toast.error('Please fill in the poll title and description');
        return;
      }

      const validOptions = pollOptions.map((option) => option.text.trim()).filter(Boolean);
      if (validOptions.length < 2) {
        toast.error('Please provide at least two options');
        return;
      }

      setPollSaving(true);
      const formDataObj = new FormData();
      formDataObj.append('title', pollForm.title);
      formDataObj.append('description', pollForm.description);
      formDataObj.append('audience', pollForm.audience);
      formDataObj.append('audienceScope', pollForm.audienceScope);
      formDataObj.append('pollType', pollForm.pollType);
      formDataObj.append('allowEdit', String(Boolean(pollForm.allowEdit)));
      formDataObj.append('options', JSON.stringify(validOptions.map((text, index) => ({ text, order: index }))));

      if (pollForm.expiryDate) {
        formDataObj.append('expiryDate', pollForm.expiryDate);
      }

      if (pollForm.audience === 'parents' && pollForm.audienceScope === 'selected_classes' && selectedClassIds.length > 0) {
        formDataObj.append('selectedClassIds', JSON.stringify(selectedClassIds));
      }

      if (pollAttachmentFile) {
        formDataObj.append('attachment', pollAttachmentFile);
      }

      await api.post('/polls', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Poll published successfully');
      setPollForm(defaultPollForm);
      setPollOptions([{ text: '' }, { text: '' }]);
      setSelectedClassIds([]);
      setPollAttachmentFile(null);
      fetchPolls();
    } catch (error) {
      console.error('Failed to create poll:', error);
      toast.error(error.response?.data?.message || 'Failed to create poll');
    } finally {
      setPollSaving(false);
    }
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds((prev) => (prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]));
  };

  const loadPollAnalytics = async (poll, showLoading = true) => {
    if (!poll?._id) return;

    if (showLoading) {
      setAnalyticsLoading(true);
    }

    try {
      const res = await api.get(`/polls/${poll._id}/analytics`);
      setSelectedPoll(poll);
      setAnalyticsData(res.data.analytics);
    } catch (error) {
      console.error('Failed to load poll analytics:', error);
      toast.error('Failed to load poll analytics');
    } finally {
      if (showLoading) {
        setAnalyticsLoading(false);
      }
    }
  };

  const getPollSummary = (poll) => {
    const totalResponses = poll.totalResponses || 0;
    const totalAudience = poll.recipientCount || 0;
    const pendingResponses = Math.max(0, totalAudience - totalResponses);
    const completion = totalAudience ? Math.round((totalResponses / totalAudience) * 100) : 0;
    return { totalAudience, totalResponses, pendingResponses, completion };
  };

  const formatDate = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredPolls = (polls || []).filter((poll) => {
    if (pollFilter === 'all') return true;
    const normalizedStatus = String(poll.status || '').toLowerCase();
    return normalizedStatus === pollFilter;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl shadow-2xl px-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 shadow-lg shadow-purple-500/30">
                <Megaphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900">Announcement Center</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">Broadcast announcements and publish interactive polls to your school community.</DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeTab === 'announcement' ? 'default' : 'outline'}
              className={activeTab === 'announcement' ? 'rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white' : 'rounded-xl'}
              onClick={() => setActiveTab('announcement')}
            >
              Create Announcement
            </Button>
            <Button
              type="button"
              variant={activeTab === 'poll' ? 'default' : 'outline'}
              className={activeTab === 'poll' ? 'rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 text-white' : 'rounded-xl'}
              onClick={() => setActiveTab('poll')}
            >
              Create Poll
            </Button>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-6 py-2">
          {activeTab === 'announcement' ? (
            <div className="space-y-6">
              <FormField label="Title">
                <Input
                  placeholder="Enter announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-purple-500"
                />
              </FormField>
              <FormField label="Message">
                <Textarea
                  placeholder="Enter announcement message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="rounded-xl border-slate-200 shadow-sm focus:ring-2 focus:ring-purple-500"
                />
              </FormField>
              <FormField label="Priority">
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-slate-400" />Normal</div>
                    </SelectItem>
                    <SelectItem value="info">
                      <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-blue-500" />Info</div>
                    </SelectItem>
                    <SelectItem value="important">
                      <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-orange-500" />Important</div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500" />Urgent</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              {role === 'school_admin' && (
                <>
                  <FormField label="Send To">
                    <Select value={targetRole} onValueChange={(value) => { setTargetRole(value); setRecipientType('all'); setSelectedRecipients([]); setSelectedClass(''); }}>
                      <SelectTrigger className="rounded-xl border-slate-200 shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Teachers</div></SelectItem>
                        <SelectItem value="parent"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Parents</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>

                  {targetRole === 'teacher' && (
                    <FormField label="Recipients">
                      <Select value={recipientType} onValueChange={setRecipientType}>
                        <SelectTrigger className="rounded-xl border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teachers</SelectItem>
                          <SelectItem value="selected">Selected Teachers</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}

                  {targetRole === 'teacher' && recipientType === 'selected' && (
                    <FormField label="Select Teachers">
                      <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-3 shadow-sm">
                        {recipients.map((recipient) => (
                          <label key={recipient._id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                            <input type="checkbox" checked={selectedRecipients.includes(recipient._id)} onChange={() => handleRecipientToggle(recipient._id)} className="rounded border-slate-300 text-purple-600 focus:ring-2 focus:ring-purple-500" />
                            <span className="text-sm font-medium text-slate-700">{recipient.teacherName || recipient.name}</span>
                          </label>
                        ))}
                      </div>
                    </FormField>
                  )}

                  {targetRole === 'parent' && (
                    <FormField label="Recipients">
                      <Select value={recipientType} onValueChange={setRecipientType}>
                        <SelectTrigger className="rounded-xl border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Parents</SelectItem>
                          <SelectItem value="class">Class-wise Parents</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}

                  {targetRole === 'parent' && recipientType === 'class' && (
                    <FormField label="Select Class">
                      <Select value={selectedClass} onValueChange={setSelectedClass}>
                        <SelectTrigger className="rounded-xl border-slate-200 shadow-sm"><SelectValue placeholder="Select a class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls._id} value={cls._id}>{cls.className} {cls.section}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  )}
                </>
              )}
              <FormField label="Attachment (Optional)">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xlsx,.csv,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const maxSize = 10 * 1024 * 1024;
                      if (file.size > maxSize) {
                        toast.error('File size exceeds 10MB limit');
                        return;
                      }
                      setAttachmentFile(file);
                    }
                  }}
                  className="rounded-xl border-slate-200 shadow-sm"
                />
                {attachmentFile && <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Paperclip className="h-4 w-4" /><span className="truncate">{attachmentFile.name}</span></div>}
              </FormField>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-lg font-semibold text-slate-900">Publish a new poll</h3>
                <p className="mt-1 text-sm text-slate-500">Choose the audience, define the options and publish it instantly to the relevant parents or teachers.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField label="Audience *">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="radio" name="poll-audience" checked={pollForm.audience === 'teachers'} onChange={() => setPollForm({ ...pollForm, audience: 'teachers', audienceScope: 'all' })} />
                      Teachers
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="radio" name="poll-audience" checked={pollForm.audience === 'parents'} onChange={() => setPollForm({ ...pollForm, audience: 'parents', audienceScope: 'all' })} />
                      Parents
                    </label>
                  </div>
                </FormField>

                <FormField label="Targeting *">
                  {pollForm.audience === 'teachers' ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Teachers support all teachers only. Individual teacher selection is not available.</div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="radio" name="parent-scope" checked={pollForm.audienceScope === 'all'} onChange={() => setPollForm({ ...pollForm, audienceScope: 'all' })} />
                        All Parents
                      </label>
                      <label className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="radio" name="parent-scope" checked={pollForm.audienceScope === 'selected_classes'} onChange={() => setPollForm({ ...pollForm, audienceScope: 'selected_classes' })} />
                        Selected Classes
                      </label>
                    </div>
                  )}
                </FormField>
              </div>

              {pollForm.audience === 'parents' && pollForm.audienceScope === 'selected_classes' && (
                <FormField label="Select Classes *">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    {classes.length === 0 ? <p className="text-sm text-slate-500">No classes available.</p> : classes.map((cls) => (
                      <label key={cls._id} className="flex items-center gap-2 rounded-lg p-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input type="checkbox" checked={selectedClassIds.includes(cls._id)} onChange={() => toggleClassSelection(cls._id)} />
                        <span>{cls.className} {cls.section}</span>
                      </label>
                    ))}
                  </div>
                </FormField>
              )}

              <FormField label="Poll Title *">
                <Input placeholder="Annual Function Permission" value={pollForm.title} onChange={(e) => setPollForm({ ...pollForm, title: e.target.value })} className="rounded-xl border-slate-200 shadow-sm" />
              </FormField>

              <FormField label="Description *">
                <Textarea placeholder="Enter poll description" value={pollForm.description} onChange={(e) => setPollForm({ ...pollForm, description: e.target.value })} rows={4} className="rounded-xl border-slate-200 shadow-sm" />
              </FormField>

              <div className="grid gap-4 lg:grid-cols-2">
                <FormField label="Poll Type">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="radio" name="poll-type" checked={pollForm.pollType === 'single'} onChange={() => setPollForm({ ...pollForm, pollType: 'single' })} />
                      Single Choice
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="radio" name="poll-type" checked={pollForm.pollType === 'multiple'} onChange={() => setPollForm({ ...pollForm, pollType: 'multiple' })} />
                      Multiple Choice
                    </label>
                  </div>
                </FormField>

                <FormField label="Expiry">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                    <Input type="datetime-local" value={pollForm.expiryDate} onChange={(e) => setPollForm({ ...pollForm, expiryDate: e.target.value })} className="rounded-xl border-slate-200 shadow-sm" />
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input type="checkbox" checked={!pollForm.expiryDate} onChange={() => setPollForm({ ...pollForm, expiryDate: '' })} />
                      No Expiry
                    </label>
                  </div>
                </FormField>
              </div>

              <FormField label="Poll Options *">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input placeholder={`Option ${index + 1}`} value={option.text} onChange={(e) => handlePollOptionChange(index, e.target.value)} className="rounded-xl border-slate-200 shadow-sm" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(index)} className="rounded-xl border border-slate-200 hover:bg-slate-50"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="rounded-xl" onClick={addPollOption}><Plus className="mr-2 h-4 w-4" />Add Option</Button>
                </div>
              </FormField>

              <FormField label="Attachments (Optional)">
                <Input type="file" accept=".pdf,.doc,.docx,.xlsx,.csv,.jpg,.jpeg,.png" onChange={(e) => { const file = e.target.files[0]; if (file) { if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10MB limit'); return; } setPollAttachmentFile(file); } }} className="rounded-xl border-slate-200 shadow-sm" />
                {pollAttachmentFile && <div className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Paperclip className="h-4 w-4" /><span className="truncate">{pollAttachmentFile.name}</span></div>}
              </FormField>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="text-sm font-medium text-slate-700">Allow voters to edit their response while the poll is active</label>
                <input type="checkbox" checked={pollForm.allowEdit} onChange={() => setPollForm({ ...pollForm, allowEdit: !pollForm.allowEdit })} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Poll Analytics</h3>
                    <p className="text-sm text-slate-500">Track response activity, audience progress, and vote breakdowns for every published poll.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => fetchPolls()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {['all', 'active', 'closed', 'expired'].map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setPollFilter(filter)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${pollFilter === filter ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>

                {pollsLoading ? (
                  <p className="text-sm text-slate-500">Loading polls...</p>
                ) : filteredPolls.length === 0 ? (
                  <p className="text-sm text-slate-500">No polls have been created yet.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredPolls.map((poll) => {
                      const summary = getPollSummary(poll);
                      return (
                        <div key={poll._id} className="rounded-xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-slate-900">{poll.title}</h4>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{poll.audience === 'teachers' ? 'Teachers' : 'Parents'}</span>
                                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">{poll.status}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-500">{poll.description}</p>
                              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Created</span><span className="mt-1 block">{formatDate(poll.createdAt)}</span></div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</span><span className="mt-1 block">{formatDate(poll.expiryDate)}</span></div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Total Audience</span><span className="mt-1 block">{summary.totalAudience}</span></div>
                                <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</span><span className="mt-1 block">{summary.totalResponses}/{summary.totalAudience}</span></div>
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                              <div className="flex items-center gap-2 font-semibold text-slate-700"><TrendingUp className="h-4 w-4 text-violet-600" />Pending {summary.pendingResponses}</div>
                              <div className="mt-2 text-xs text-slate-500">Completion {summary.completion}%</div>
                              <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={() => loadPollAnalytics(poll)}><BarChart3 className="mr-2 h-4 w-4" />View Analytics</Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedPoll && (
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-slate-50 p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{selectedPoll.title}</h3>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{selectedPoll.audience === 'teachers' ? 'Teachers' : 'Parents'}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{selectedPoll.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="rounded-xl" onClick={() => loadPollAnalytics(selectedPoll, false)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
                      <Button type="button" variant="ghost" className="rounded-xl" onClick={() => { setSelectedPoll(null); setAnalyticsData(null); }}>Close</Button>
                    </div>
                  </div>

                  {analyticsLoading ? (
                    <p className="text-sm text-slate-500">Loading analytics...</p>
                  ) : !analyticsData ? (
                    <p className="text-sm text-slate-500">No analytics available yet.</p>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created By</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsData.poll.createdByName}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created Date</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{formatDate(analyticsData.poll.createdAt)}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{formatDate(analyticsData.poll.expiryDate)}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{analyticsData.poll.status}</p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Audience</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">{analyticsData.summary.totalAudience}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses Received</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">{analyticsData.summary.responsesReceived}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">{analyticsData.summary.pendingResponses}</p>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Completion %</p>
                          <p className="mt-1 text-2xl font-bold text-slate-900">{analyticsData.summary.completionPercent}%</p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><PieChartIcon className="h-4 w-4 text-violet-600" />Vote Distribution</div>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={analyticsData.optionSummary} dataKey="count" nameKey="option" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                  {analyticsData.optionSummary.map((entry, index) => (
                                    <Cell key={`${entry.option}-${index}`} fill={['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#6366f1'][index % 6]} />
                                  ))}
                                </Pie>
                                <RechartsTooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-3 space-y-2">
                            {analyticsData.optionSummary.map((item, index) => (
                              <div key={item.option} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
                                <span>{item.option}</span>
                                <span>{item.count} votes • {item.percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><BarChart3 className="h-4 w-4 text-indigo-600" />Votes per Option</div>
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={analyticsData.optionSummary} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="option" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} />
                                <RechartsTooltip />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#7c3aed" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 lg:grid-cols-2">
                        {analyticsData.parentBreakdown.length > 0 ? (
                          <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-emerald-600" />Parent Breakdown</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm text-slate-600">
                                <thead>
                                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                    <th className="py-2 pr-3">Class</th>
                                    <th className="py-2 pr-3">Total Parents</th>
                                    <th className="py-2 pr-3">Responded</th>
                                    <th className="py-2 pr-3">Pending</th>
                                    <th className="py-2 pr-3">Completion %</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {analyticsData.parentBreakdown.map((row) => (
                                    <tr key={row.className} className="border-b border-slate-100">
                                      <td className="py-2 pr-3 font-medium text-slate-700">{row.className}</td>
                                      <td className="py-2 pr-3">{row.totalParents}</td>
                                      <td className="py-2 pr-3">{row.responded}</td>
                                      <td className="py-2 pr-3">{row.pending}</td>
                                      <td className="py-2 pr-3">{row.completion}%</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : null}

                        {analyticsData.teacherBreakdown ? (
                          <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><GraduationCap className="h-4 w-4 text-cyan-600" />Teacher Poll</div>
                            <div className="space-y-3">
                              <div className="rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                  <span>All Teachers</span>
                                  <span className="font-semibold text-slate-900">{analyticsData.teacherBreakdown.totalTeachers}</span>
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                  <span>Responded</span>
                                  <span className="font-semibold text-slate-900">{analyticsData.teacherBreakdown.responded}</span>
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                  <span>Pending</span>
                                  <span className="font-semibold text-slate-900">{analyticsData.teacherBreakdown.pending}</span>
                                </div>
                              </div>
                              <div className="rounded-lg border border-slate-200 p-3">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                  <span>Completion %</span>
                                  <span className="font-semibold text-slate-900">{analyticsData.teacherBreakdown.completion}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-6 rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><Circle className="h-4 w-4 text-purple-600" />Response List</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm text-slate-600">
                            <thead>
                              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                <th className="py-2 pr-3">Name</th>
                                <th className="py-2 pr-3">Role</th>
                                <th className="py-2 pr-3">Student</th>
                                <th className="py-2 pr-3">Class</th>
                                <th className="py-2 pr-3">Selected Option</th>
                                <th className="py-2 pr-3">Submitted At</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analyticsData.responses.map((response) => (
                                <tr key={`${response.name}-${response.submittedAt}`} className="border-b border-slate-100">
                                  <td className="py-2 pr-3 font-medium text-slate-700">{response.name}</td>
                                  <td className="py-2 pr-3">{response.role}</td>
                                  <td className="py-2 pr-3">{response.studentName || '—'}</td>
                                  <td className="py-2 pr-3">{response.className || '—'}</td>
                                  <td className="py-2 pr-3">{response.selectedOption || '—'}</td>
                                  <td className="py-2 pr-3">{formatDate(response.submittedAt)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter className="pt-6">
          {activeTab === 'announcement' ? (
            <>
              <Button variant="outline" onClick={() => { setAttachmentFile(null); onOpenChange(false); }} disabled={loading} className="rounded-xl border-slate-200 font-medium hover:bg-slate-50">Cancel</Button>
              <Button onClick={handleSend} disabled={loading} className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200">{loading ? 'Sending...' : 'Send Announcement'}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => { setPollForm(defaultPollForm); setPollOptions([{ text: '' }, { text: '' }]); setSelectedClassIds([]); setPollAttachmentFile(null); onOpenChange(false); }} disabled={pollSaving} className="rounded-xl border-slate-200 font-medium hover:bg-slate-50">Cancel</Button>
              <Button onClick={handleCreatePoll} disabled={pollSaving} className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-200">{pollSaving ? 'Publishing...' : 'Publish Poll'}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}