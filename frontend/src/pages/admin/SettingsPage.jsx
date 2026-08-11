import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, School, Users, Lock, Save, Trash2, Upload, 
  Eye, EyeOff, ShieldCheck, Mail, Phone, User, Globe, MapPin, ChevronRight,
  Info, MessageSquare, GraduationCap, Send
} from 'lucide-react';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/erp/PagePrimitives';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [showTabContentOnMobile, setShowTabContentOnMobile] = useState(false);

  // Feature Request State
  const [featureMessage, setFeatureMessage] = useState('');
  const [sendingFeature, setSendingFeature] = useState(false);

  // General Settings State
  const [generalForm, setGeneralForm] = useState({
    schoolName: '',
    schoolCode: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: ''
  });
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Branding State
  const [logoPreview, setLogoPreview] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  // Account State
  const [accountForm, setAccountForm] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [savingAccount, setSavingAccount] = useState(false);

  // Security State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [showOTPField, setShowOTPField] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Populate data from user context
  useEffect(() => {
    if (user?.school) {
      setGeneralForm({
        schoolName: user.school.schoolName || '',
        schoolCode: user.school.schoolCode || '',
        address: user.school.address || '',
        city: user.school.city || '',
        state: user.school.state || '',
        pincode: user.school.pincode || '',
        phone: user.school.phone || ''
      });
      setLogoPreview(user.school.logo || '');
    }
    if (user) {
      setAccountForm({
        name: user.name || '',
        phone: user.phoneNo || user.phone || '',
        email: user.email || ''
      });
    }
  }, [user]);

  // General Save
  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!generalForm.schoolName.trim()) {
      toast.error('School Name is required');
      return;
    }

    setSavingGeneral(true);
    try {
      const res = await api.put('/auth/school-settings', generalForm);
      
      // Save Logo if it has changed
      let updatedLogo = user?.school?.logo || '';
      if (logoPreview !== (user?.school?.logo || '')) {
        setSavingLogo(true);
        try {
          await api.put('/auth/school-logo', { logo: logoPreview });
          updatedLogo = logoPreview;
        } catch (logoErr) {
          console.error("Failed to save logo:", logoErr);
          toast.error("Failed to save logo changes");
        } finally {
          setSavingLogo(false);
        }
      }

      toast.success('School settings and logo updated successfully');
      
      // Update local context
      const updatedUser = {
        ...user,
        school: {
          ...user.school,
          ...res.data.school,
          logo: updatedLogo
        }
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update general settings');
    } finally {
      setSavingGeneral(false);
    }
  };

  // Branding: Handle Logo file change (converts to base64)
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Maximum file size allowed is 2MB');
      return;
    }

    // Check file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Supported formats are PNG, JPG and JPEG');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Save Branding
  const handleSaveBranding = async () => {
    setSavingLogo(true);
    try {
      await api.put('/auth/school-logo', { logo: logoPreview });
      toast.success('School branding updated successfully');
      
      // Update local context
      const updatedUser = {
        ...user,
        school: {
          ...user.school,
          logo: logoPreview
        }
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update school logo');
    } finally {
      setSavingLogo(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoPreview('');
  };

  // Account Save
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accountForm.name.trim()) {
      toast.error('Admin Name is required');
      return;
    }

    setSavingAccount(true);
    try {
      const res = await api.put('/auth/update-account', accountForm);
      toast.success('Account profile updated successfully');
      
      // Update context
      const updatedUser = {
        ...user,
        ...res.data.user
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update account profile');
    } finally {
      setSavingAccount(false);
    }
  };

  // Send Password OTP
  const handleSendOTP = async () => {
    if (!securityForm.currentPassword) {
      toast.error('Please enter your current password first');
      return;
    }

    setSendingOTP(true);
    try {
      await api.post('/auth/send-password-change-otp', {
        currentPassword: securityForm.currentPassword
      });
      setShowOTPField(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  // Security (Change Password) Save
  const handleSaveSecurity = async (e) => {
    e.preventDefault();

    if (securityForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    const isAdmin = user?.role === 'school_admin' || user?.role === 'super_admin';
    if (isAdmin && !securityForm.otp) {
      toast.error('Please request and enter your verification OTP');
      return;
    }

    setChangingPassword(true);
    try {
      const payload = {
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword
      };
      if (isAdmin) {
        payload.otp = securityForm.otp;
      }

      await api.put('/auth/change-password', payload);
      toast.success('Password updated successfully!');
      
      // Clear security form
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        otp: ''
      });
      setShowOTPField(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update security password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestFeature = async (e) => {
    e.preventDefault();
    if (!featureMessage.trim()) {
      toast.error('Please enter your feature request details.');
      return;
    }

    setSendingFeature(true);
    try {
      await api.post('/auth/request-feature', { message: featureMessage });
      toast.success('Your feature request has been sent to the Super Admin!');
      setFeatureMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send feature request');
    } finally {
      setSendingFeature(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'account', label: 'Account', icon: Users },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'about', label: 'About Us', icon: Info },
    { id: 'request_feature', label: 'Request a Feature', icon: MessageSquare }
  ];

  return (
    <div className="space-y-3 max-w-6xl mx-auto pt-0 pb-10 px-2 sm:px-4">
      
      <PageHeader 
        title="Settings" 
        description="Configure your school administration parameters, credentials, and custom branding."
      />

      {/* Segmented control style horizontal tabs - Desktop only */}
      <div className={`hidden md:inline-flex flex-wrap p-1 bg-slate-100/80 border border-slate-200/60 rounded-full shadow-sm gap-1`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowTabContentOnMobile(true);
              }}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-sm border-0' 
                  : 'text-slate-500 hover:text-slate-855 bg-transparent border-0'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Mobile Settings List Menu - Phone view only */}
      <div className={`md:hidden space-y-2.5 ${showTabContentOnMobile ? 'hidden' : 'block'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const colors = {
            general: 'bg-blue-500',
            account: 'bg-emerald-500',
            security: 'bg-orange-500',
            about: 'bg-indigo-500',
            request_feature: 'bg-purple-500'
          };
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setShowTabContentOnMobile(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200/80 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${colors[tab.id]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-800 text-sm">{tab.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          );
        })}
      </div>

      {/* Active Form Card */}
      <div className={`w-full ${showTabContentOnMobile ? 'block' : 'hidden md:block'}`}>
        {showTabContentOnMobile && (
          <button
            type="button"
            onClick={() => setShowTabContentOnMobile(false)}
            className="md:hidden flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 mb-3.5 cursor-pointer bg-transparent border-0 p-0"
          >
            ← Back to Settings
          </button>
        )}
          
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <ErpSection 
              title="General School Parameters & Branding" 
              icon={Building2} 
              tone="blue"
              className="bg-gradient-to-br from-white to-blue-50/60 border-slate-200/80 shadow-md"
            >
              <form onSubmit={handleSaveGeneral} className="p-2 sm:p-3 space-y-3">
                {/* Logo and Main Details Row */}
                <div className="flex flex-col md:flex-row gap-4 pb-3 border-b border-slate-100">
                  {/* Logo Upload Card */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/50 shadow-sm w-full md:w-[125px]">
                    <span className="text-[10px] font-bold text-slate-600">School Logo</span>
                    <div className="relative h-20 w-20 rounded-lg border border-dashed border-slate-350 flex items-center justify-center overflow-hidden bg-white shadow-sm shrink-0">
                      {logoPreview ? (
                        <img 
                          src={logoPreview} 
                          alt="Logo Preview" 
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                          <School className="h-4 w-4 mb-0.5 text-slate-355" />
                          <span className="text-[8.5px] font-bold text-center leading-none text-slate-400">No Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[9px] font-bold px-2 py-1 cursor-pointer transition-all shadow-sm flex items-center gap-1">
                        <Upload className="h-2 w-2 text-slate-500" />
                        Upload
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg" 
                          onChange={handleLogoChange} 
                          className="hidden" 
                        />
                      </label>
                      {logoPreview && (
                        <button 
                          type="button" 
                          onClick={handleRemoveLogo}
                          className="text-rose-500 hover:text-rose-600 bg-rose-50/50 border border-rose-100 hover:bg-rose-50 rounded-lg text-[9px] font-bold px-2 py-1 cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="h-2 w-2" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Input Fields Column */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <FormField label="School Name">
                      <Input 
                        value={generalForm.schoolName}
                        onChange={(e) => setGeneralForm({...generalForm, schoolName: e.target.value})}
                        placeholder="e.g. ABC Public School"
                        className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                        required
                      />
                    </FormField>
                    <FormField label="School Code (Optional)">
                      <Input 
                        value={generalForm.schoolCode}
                        onChange={(e) => setGeneralForm({...generalForm, schoolCode: e.target.value})}
                        placeholder="e.g. SCH123"
                        className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                      />
                    </FormField>
                    <FormField label="Phone Number" className="sm:col-span-2">
                      <Input 
                        value={generalForm.phone}
                        onChange={(e) => setGeneralForm({...generalForm, phone: e.target.value})}
                        placeholder="e.g. +91 9876543210"
                        className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Address Row */}
                <FormField label="School Address">
                  <Input 
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({...generalForm, address: e.target.value})}
                    placeholder="Street Address, Block Name"
                    className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                  />
                </FormField>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormField label="City">
                    <Input 
                      value={generalForm.city}
                      onChange={(e) => setGeneralForm({...generalForm, city: e.target.value})}
                      placeholder="e.g. New Delhi"
                      className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                    />
                  </FormField>
                  <FormField label="State">
                    <Input 
                      value={generalForm.state}
                      onChange={(e) => setGeneralForm({...generalForm, state: e.target.value})}
                      placeholder="e.g. Delhi"
                      className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                    />
                  </FormField>
                  <FormField label="Pincode">
                    <Input 
                      value={generalForm.pincode}
                      onChange={(e) => setGeneralForm({...generalForm, pincode: e.target.value})}
                      placeholder="e.g. 110001"
                      className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                    />
                  </FormField>
                </div>
                
                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={savingGeneral || savingLogo}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-9 px-6 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingGeneral || savingLogo ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

          {/* 2. ACCOUNT TAB */}
          {activeTab === 'account' && (
            <ErpSection 
              title="School Administrator Details" 
              icon={Users} 
              tone="blue"
              className="bg-gradient-to-br from-white to-blue-50/60 border-slate-200/80 shadow-md"
            >
              <form onSubmit={handleSaveAccount} className="p-2 sm:p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormField label="Administrator Name">
                    <Input 
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                      required
                    />
                  </FormField>
                  <FormField label="Administrator Phone">
                    <Input 
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({...accountForm, phone: e.target.value})}
                      placeholder="e.g. +91 9999988888"
                      className="rounded-lg border-slate-200 h-9 text-xs bg-white shadow-sm"
                    />
                  </FormField>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <FormField label="Email Address">
                    <Input 
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="rounded-lg border-slate-200 h-9 text-xs bg-slate-50 cursor-not-allowed shadow-inner"
                    />
                  </FormField>
                  <FormField label="Role (System Assigned)">
                    <Input 
                      value={user?.role?.replace('_', ' ')?.toUpperCase() || 'SCHOOL ADMIN'}
                      disabled
                      className="rounded-lg border-slate-200 h-9 text-xs bg-slate-50 cursor-not-allowed shadow-inner"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={savingAccount}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-9 px-6 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingAccount ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

          {/* 3. SECURITY TAB */}
          {activeTab === 'security' && (
            <ErpSection 
              title="Security Credentials" 
              icon={Lock} 
              tone="blue"
              className="bg-gradient-to-br from-white to-blue-50/60 border-slate-200/80 shadow-md"
            >
              <form onSubmit={handleSaveSecurity} className="p-2 sm:p-3 space-y-3">
                <div className="grid grid-cols-1 gap-2.5">
                  <FormField label="Current Password">
                    <div className="relative">
                      <Input 
                        type={showPassword.current ? 'text' : 'password'}
                        value={securityForm.currentPassword}
                        onChange={(e) => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                        placeholder="Current password"
                        className="rounded-lg border-slate-200 h-9 text-xs pr-10 bg-white shadow-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 bg-transparent border-0 cursor-pointer"
                      >
                        {showPassword.current ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <FormField label="New Password">
                      <div className="relative">
                        <Input 
                          type={showPassword.new ? 'text' : 'password'}
                          value={securityForm.newPassword}
                          onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                          placeholder="New password (min 8 characters)"
                          className="rounded-lg border-slate-200 h-9 text-xs pr-10 bg-white shadow-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword.new ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormField>

                    <FormField label="Confirm New Password">
                      <div className="relative">
                        <Input 
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={securityForm.confirmPassword}
                          onChange={(e) => setSecurityForm({...securityForm, confirmPassword: e.target.value})}
                          placeholder="Confirm new password"
                          className="rounded-lg border-slate-200 h-9 text-xs pr-10 bg-white shadow-sm"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword.confirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* OTP Section for Admins */}
                {user?.role === 'school_admin' && (
                  <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 space-y-2.5 mt-1.5 shadow-inner">
                    <div className="flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
                      <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>Admin accounts require verification OTP sent to your email to perform password updates.</span>
                    </div>

                    {!showOTPField ? (
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={sendingOTP || !securityForm.currentPassword}
                        variant="outline"
                        className="w-full h-9 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 border-slate-200 cursor-pointer text-slate-700 bg-white shadow-sm"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {sendingOTP ? 'Sending OTP...' : 'Send OTP to Email'}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <FormField label="Enter Verification OTP">
                          <Input 
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={securityForm.otp}
                            onChange={(e) => setSecurityForm({...securityForm, otp: e.target.value.replace(/\D/g, '').slice(0,6)})}
                            className="rounded-lg border-slate-200 h-9 text-center tracking-widest font-bold text-sm bg-white shadow-sm"
                            maxLength={6}
                            required
                          />
                        </FormField>
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={sendingOTP}
                          className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-indigo-655 mt-1 cursor-pointer transition-colors border-0 bg-transparent"
                        >
                          Resend OTP
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={changingPassword}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-9 px-6 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {changingPassword ? 'Updating...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

          {/* 4. ABOUT US TAB */}
          {activeTab === 'about' && (
            <ErpSection 
              title="About Test Master" 
              icon={Info} 
              tone="blue"
              className="bg-gradient-to-br from-white to-blue-50/60 border-slate-200/80 shadow-md"
            >
              <div className="p-4 space-y-4 text-slate-600">
                <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-100">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-650 text-white shadow-md shadow-indigo-500/20 shrink-0">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Test Master Pro</h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Version 2.4.0 (Stable)</p>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <p className="leading-relaxed">
                    Test Master is an enterprise-grade School Management & Daily Test evaluation suite designed to streamline student assessments, academic session tracking, teacher coordination, parent communication, and instant reporting.
                  </p>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150 space-y-1.5 font-medium text-slate-550">
                    <div className="flex justify-between gap-4">
                      <span>Customer License:</span>
                      <span className="font-bold text-slate-700">Active (Enterprise Edition)</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Assigned Institution:</span>
                      <span className="font-bold text-slate-700">{user?.school?.schoolName || 'Your School'}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Technical Support:</span>
                      <span className="font-bold text-slate-700">support@testmaster.com</span>
                    </div>
                  </div>
                </div>
              </div>
            </ErpSection>
          )}

          {/* 5. REQUEST FEATURE TAB */}
          {activeTab === 'request_feature' && (
            <ErpSection 
              title="Request a Feature" 
              icon={MessageSquare} 
              tone="blue"
              className="bg-gradient-to-br from-white to-blue-50/60 border-slate-200/80 shadow-md"
            >
              <form onSubmit={handleRequestFeature} className="p-4 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Have an idea to improve the platform? Describe the feature you want, and your request will be delivered directly to the Super Admin team for evaluation and future product updates.
                </p>
                <FormField label="Describe the feature details" required>
                  <Textarea 
                    value={featureMessage}
                    onChange={(e) => setFeatureMessage(e.target.value)}
                    placeholder="Please write details of the feature you want to request..."
                    rows={5}
                    className="rounded-lg border-slate-200 text-xs bg-white shadow-sm p-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </FormField>
                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={sendingFeature}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-9 px-6 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sendingFeature ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

        </div>

    </div>
  );
}
