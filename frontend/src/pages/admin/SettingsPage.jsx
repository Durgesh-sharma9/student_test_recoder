import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, School, Users, Lock, Save, Trash2, Upload, 
  Eye, EyeOff, ShieldCheck, Mail, Phone, User, Globe, MapPin
} from 'lucide-react';
import { PageHeader, ErpSection } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/erp/PagePrimitives';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [generalForm, setGeneralForm] = useState({
    schoolName: '',
    schoolCode: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: ''
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
        phone: user.school.phone || '',
        email: user.school.email || ''
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
      toast.success('School settings updated successfully');
      
      // Update local context
      const updatedUser = {
        ...user,
        school: {
          ...user.school,
          ...res.data.school
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

  const tabs = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'branding', label: 'School Branding', icon: School },
    { id: 'account', label: 'Account', icon: Users },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  return (
    <div className="space-y-4 max-w-6xl mx-auto pt-1 pb-10 px-2 sm:px-4">
      
      <PageHeader 
        title="Settings" 
        description="Configure your school administration parameters, credentials, and custom branding."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Left Tabs Switcher */}
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/50' 
                    : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Active Form Card */}
        <div className="md:col-span-3">
          
          {/* 1. GENERAL TAB */}
          {activeTab === 'general' && (
            <ErpSection title="General School Parameters" icon={Building2} tone="blue">
              <form onSubmit={handleSaveGeneral} className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="School Name">
                    <Input 
                      value={generalForm.schoolName}
                      onChange={(e) => setGeneralForm({...generalForm, schoolName: e.target.value})}
                      placeholder="e.g. ABC Public School"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                      required
                    />
                  </FormField>
                  <FormField label="School Code (Optional)">
                    <Input 
                      value={generalForm.schoolCode}
                      onChange={(e) => setGeneralForm({...generalForm, schoolCode: e.target.value})}
                      placeholder="e.g. SCH123"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                  <FormField label="Phone Number">
                    <Input 
                      value={generalForm.phone}
                      onChange={(e) => setGeneralForm({...generalForm, phone: e.target.value})}
                      placeholder="e.g. +91 9876543210"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                  <FormField label="Email Address">
                    <Input 
                      type="email"
                      value={generalForm.email}
                      onChange={(e) => setGeneralForm({...generalForm, email: e.target.value})}
                      placeholder="e.g. contact@school.com"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                </div>
                <FormField label="School Address">
                  <Input 
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm({...generalForm, address: e.target.value})}
                    placeholder="Street Address, Block Name"
                    className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                  />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="City">
                    <Input 
                      value={generalForm.city}
                      onChange={(e) => setGeneralForm({...generalForm, city: e.target.value})}
                      placeholder="e.g. New Delhi"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                  <FormField label="State">
                    <Input 
                      value={generalForm.state}
                      onChange={(e) => setGeneralForm({...generalForm, state: e.target.value})}
                      placeholder="e.g. Delhi"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                  <FormField label="Pincode">
                    <Input 
                      value={generalForm.pincode}
                      onChange={(e) => setGeneralForm({...generalForm, pincode: e.target.value})}
                      placeholder="e.g. 110001"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                </div>
                
                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={savingGeneral}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-10 px-5 font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {savingGeneral ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

          {/* 2. SCHOOL BRANDING TAB */}
          {activeTab === 'branding' && (
            <ErpSection title="School Branding Logo" icon={School} tone="blue">
              <div className="p-4 space-y-4">
                <p className="text-xs text-slate-500">
                  Upload your official School Logo. This will be automatically embedded in generated reports, PDFs, signature sheets, and certificates.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  {/* File Upload Box */}
                  <div className="relative h-32 w-32 rounded-xl border border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-white group shadow-sm shrink-0">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="School Logo Preview" 
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                        <School className="h-8 w-8 mb-1 text-slate-350" />
                        <span className="text-[10px] font-semibold text-center">No Logo Uploaded</span>
                      </div>
                    )}
                  </div>

                  {/* Actions / Inputs */}
                  <div className="space-y-3 flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <label className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold px-4 py-2 cursor-pointer transition-all flex items-center gap-1.5 shadow-sm h-10">
                        <Upload className="h-4 w-4 text-slate-450" />
                        Upload New Image
                        <input 
                          type="file" 
                          accept=".png,.jpg,.jpeg" 
                          onChange={handleLogoChange} 
                          className="hidden" 
                        />
                      </label>
                      
                      {logoPreview && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={handleRemoveLogo}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-400">
                      Supported formats: PNG, JPG, JPEG (Max Size: 2MB).
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="button" 
                    onClick={handleSaveBranding}
                    disabled={savingLogo}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-10 px-5 font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {savingLogo ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </ErpSection>
          )}

          {/* 3. ACCOUNT TAB */}
          {activeTab === 'account' && (
            <ErpSection title="School Administrator Details" icon={Users} tone="blue">
              <form onSubmit={handleSaveAccount} className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Administrator Name">
                    <Input 
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                      required
                    />
                  </FormField>
                  <FormField label="Administrator Phone">
                    <Input 
                      value={accountForm.phone}
                      onChange={(e) => setAccountForm({...accountForm, phone: e.target.value})}
                      placeholder="e.g. +91 9999988888"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Email Address">
                    <Input 
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({...accountForm, email: e.target.value})}
                      placeholder="e.g. admin@school.com"
                      className="rounded-lg border-slate-200 h-10 text-xs bg-white"
                    />
                  </FormField>
                  <FormField label="Role (System Assigned)">
                    <Input 
                      value={user?.role?.replace('_', ' ')?.toUpperCase() || 'SCHOOL ADMIN'}
                      disabled
                      className="rounded-lg border-slate-200 h-10 text-xs bg-slate-50 cursor-not-allowed"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 mt-2">
                  <Button 
                    type="submit" 
                    disabled={savingAccount}
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-10 px-5 font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {savingAccount ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

          {/* 4. SECURITY TAB */}
          {activeTab === 'security' && (
            <ErpSection title="Security Credentials" icon={Lock} tone="blue">
              <form onSubmit={handleSaveSecurity} className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Current Password">
                    <div className="relative">
                      <Input 
                        type={showPassword.current ? 'text' : 'password'}
                        value={securityForm.currentPassword}
                        onChange={(e) => setSecurityForm({...securityForm, currentPassword: e.target.value})}
                        placeholder="Current password"
                        className="rounded-lg border-slate-200 h-10 text-xs pr-10 bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword({...showPassword, current: !showPassword.current})}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 bg-transparent border-0 cursor-pointer"
                      >
                        {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="New Password">
                      <div className="relative">
                        <Input 
                          type={showPassword.new ? 'text' : 'password'}
                          value={securityForm.newPassword}
                          onChange={(e) => setSecurityForm({...securityForm, newPassword: e.target.value})}
                          placeholder="New password (min 8 characters)"
                          className="rounded-lg border-slate-200 h-10 text-xs pr-10 bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, new: !showPassword.new})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                          className="rounded-lg border-slate-200 h-10 text-xs pr-10 bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 bg-transparent border-0 cursor-pointer"
                        >
                          {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormField>
                  </div>
                </div>

                {/* OTP Section for Admins */}
                {user?.role === 'school_admin' && (
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3.5 mt-2">
                    <div className="flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
                      <ShieldCheck className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                      <span>Admin accounts require verification OTP sent to your email to perform password updates.</span>
                    </div>

                    {!showOTPField ? (
                      <Button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={sendingOTP || !securityForm.currentPassword}
                        variant="outline"
                        className="w-full h-10 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border-slate-200 cursor-pointer text-slate-700 bg-white"
                      >
                        <Mail className="h-4 w-4 text-slate-400" />
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
                            className="rounded-lg border-slate-200 h-10 text-center tracking-widest font-bold text-sm bg-white"
                            maxLength={6}
                            required
                          />
                        </FormField>
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={sendingOTP}
                          className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-indigo-600 mt-1 cursor-pointer transition-colors border-0 bg-transparent"
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
                    className="bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-700 hover:to-indigo-750 text-white rounded-xl shadow-md border-0 h-10 px-5 font-bold cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    {changingPassword ? 'Updating...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </ErpSection>
          )}

        </div>

      </div>

    </div>
  );
}
