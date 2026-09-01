import React, { useState, useEffect, useRef } from 'react'
import {
  Settings,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  DollarSign,
  Clock,
  Upload,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { settingsAPI } from '../../services/api.js'
import { useToast } from '../../common/ToastContext.jsx'
import { normalizePhoneNumber } from '../../utils/formatUtils.js'

function AdminSettings() {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Company and configuration settings state
  const [settingsData, setSettingsData] = useState({
    company_name: '',
    legal_name: '',
    tax_id_gstin: '',
    pan_no: '',
    registration_no: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    logo_url: '',
    currency: 'INR (₹)',
    time_zone: 'Asia/Kolkata (IST)',
    allow_self_signup: false,
    rate_limit_per_min: 60
  })

  // Load Settings on mount
  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await settingsAPI.getSettings()
      if (res && res.data) {
        const d = res.data
        setSettingsData({
          company_name: d.company_name || '',
          legal_name: d.legal_name || '',
          tax_id_gstin: d.tax_id_gstin || '',
          pan_no: d.pan_no || '',
          registration_no: d.registration_no || '',
          email: d.email || '',
          phone: d.phone || '',
          website: d.website || '',
          address: d.address || '',
          logo_url: d.logo_url || '',
          currency: d.currency || 'INR (₹)',
          time_zone: d.time_zone || 'Asia/Kolkata (IST)',
          allow_self_signup: d.allow_self_signup === true,
          rate_limit_per_min: d.rate_limit_per_min || 60
        })
      }
    } catch (err) {
      showToast('Error retrieving system settings from Supabase', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  // Input change handler
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const finalValue = name === 'phone'
      ? normalizePhoneNumber(value)
      : type === 'checkbox' ? checked : value
    setSettingsData((prev) => ({
      ...prev,
      [name]: finalValue
    }))
  }

  // Handle Logo Upload File Explorer Conversion
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result
      if (typeof dataUrl === 'string') {
        setSettingsData((prev) => ({ ...prev, logo_url: dataUrl }))
        showToast('Logo image uploaded locally. Click Save to persist change.', 'info')
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle Form Submit
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await settingsAPI.updateSettings(settingsData)
      showToast('System settings updated and saved to Supabase successfully!', 'success')
    } catch (err) {
      showToast('Failed to save settings modifications to database', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight">System Settings &amp; Configuration</h1>
          <p className="text-xs text-slate-500 mt-1">Configure company profiles, tax preferences, currency units, and security rules.</p>
        </div>
        <button
          onClick={loadSettings}
          disabled={loading}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} /> Reload Settings
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500 font-bold bg-white rounded-2xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          Fetching settings profile data from Supabase...
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Logo Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-center">
            <div className="relative shrink-0">
              {settingsData.logo_url ? (
                <img
                  src={settingsData.logo_url}
                  alt="Company Logo"
                  className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-xs bg-slate-50"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/20">
                  {settingsData.company_name ? settingsData.company_name.substring(0, 2).toUpperCase() : 'TC'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition cursor-pointer shadow-md shadow-blue-600/20"
                title="Upload Logo"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900">Organization Logo</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                This logo will appear on EOD reports, print-ready profile documents, and headers. Standard dimensions: 512x512 pixels.
              </p>
            </div>
          </div>

          {/* Business details grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-blue-600" /> Organization Profile details
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Trade / Brand Name</label>
                <input
                  type="text"
                  name="company_name"
                  value={settingsData.company_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Legal Entity Name</label>
                <input
                  type="text"
                  name="legal_name"
                  value={settingsData.legal_name}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  name="tax_id_gstin"
                  value={settingsData.tax_id_gstin}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">PAN Account Number</label>
                <input
                  type="text"
                  name="pan_no"
                  value={settingsData.pan_no}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Corporate Registration Number</label>
                <input
                  type="text"
                  name="registration_no"
                  value={settingsData.registration_no}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Website Address</label>
                <input
                  type="text"
                  name="website"
                  value={settingsData.website}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Contact Email</label>
                <input
                  type="email"
                  name="email"
                  value={settingsData.email}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  placeholder="10-digit number"
                  value={settingsData.phone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Registered Office Address</label>
                <textarea
                  name="address"
                  rows={2}
                  value={settingsData.address}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Localization preferences */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-600" /> Localization & Preferences
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">System Time Zone</label>
                <select
                  name="time_zone"
                  value={settingsData.time_zone}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden"
                >
                  <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                  <option value="America/New_York (EST)">America/New_York (EST)</option>
                  <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                  <option value="Asia/Singapore (SGT)">Asia/Singapore (SGT)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">System Currency</label>
                <select
                  name="currency"
                  value={settingsData.currency}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-900 focus:outline-hidden"
                >
                  <option value="INR (₹)">INR (₹) — Indian Rupee</option>
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {saving ? 'Saving changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AdminSettings
