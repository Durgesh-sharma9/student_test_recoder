import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader, ErpSection, FormField, PageStack } from '@/components/erp/PagePrimitives';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function TrialSettings() {
  const [settings, setSettings] = useState({ enabled: true, durationDays: 14 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trial-settings');
      setSettings(res.data.settings);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load trial settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/trial-settings', settings);
      toast.success('Trial settings updated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update trial settings');
    } finally {
      setSaving(false);
    }
  };

  const durationOptions = [7, 14, 30];

  return (
    <PageStack>
      <PageHeader
        title="Trial Settings"
        description="Configure free trial settings for new school signups."
      />

      <ErpSection title="Trial Configuration" icon={Settings} tone="blue">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading settings...</div>
        ) : (
          <div className="space-y-6">
            {/* Enable/Disable Trial */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-indigo-50 text-indigo-600">
                  {settings.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Enable Free Trial</p>
                  <p className="text-xs text-slate-500">
                    {settings.enabled ? 'New schools will receive a free trial on signup' : 'Free trial is disabled'}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
              />
            </div>

            {/* Trial Duration */}
            {settings.enabled && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl p-2.5 bg-amber-50 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Trial Duration</p>
                    <p className="text-xs text-slate-500">Number of days for free trial period</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {durationOptions.map((days) => (
                    <button
                      key={days}
                      onClick={() => setSettings({ ...settings, durationDays: days })}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        settings.durationDays === days
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        )}
      </ErpSection>
    </PageStack>
  );
}
