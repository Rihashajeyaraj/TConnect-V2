import { useState, useEffect, useRef } from 'react'
import { draftsAPI } from './api.js'

/**
 * Custom hook for automatic form draft saving to Supabase auto_save_drafts table.
 * @param {string} formKey - Unique key for the form (e.g. 'draft_lead_form')
 * @param {object} initialValues - Default values for the form
 * @param {number} delayMs - Debounce delay in milliseconds (default: 1500ms)
 * @param {string} recordId - Associated record ID (default: 'new')
 */
export function useAutoSave(formKey, initialValues, delayMs = 1500, recordId = 'new') {
  const [formData, setFormData] = useState(initialValues)
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'idle'
  
  const hasLoadedDraft = useRef(false)
  const isFirstRender = useRef(true)

  // Load draft on mount / key changes
  useEffect(() => {
    let active = true
    hasLoadedDraft.current = false
    
    async function load() {
      try {
        const res = await draftsAPI.getDraft(formKey, recordId)
        if (active && res?.data?.draft?.draft_data) {
          setFormData(res.data.draft.draft_data)
          setSaveStatus('saved')
        }
      } catch (err) {
        console.warn('Failed to load draft from Supabase:', err)
      } finally {
        if (active) {
          hasLoadedDraft.current = true
        }
      }
    }
    load()

    return () => {
      active = false
    }
  }, [formKey, recordId])

  // Clean form data by stripping File objects and large base64 data strings (>10KB)
  const cleanFormDataForDraft = (data) => {
    if (!data || typeof data !== 'object') return data
    if (data instanceof File || data instanceof Blob) return undefined
    if (Array.isArray(data)) {
      return data.map(cleanFormDataForDraft).filter(v => v !== undefined)
    }
    const cleaned = {}
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof File || value instanceof Blob) continue
      if (typeof value === 'string' && value.length > 10000 && (value.startsWith('data:') || value.startsWith('blob:'))) continue
      if (typeof value === 'object' && value !== null) {
        cleaned[key] = cleanFormDataForDraft(value)
      } else {
        cleaned[key] = value
      }
    }
    return cleaned
  }

  // Save draft on changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!hasLoadedDraft.current) {
      return
    }

    setSaveStatus('saving')
    const handler = setTimeout(async () => {
      try {
        const payloadToSave = cleanFormDataForDraft(formData)
        await draftsAPI.saveDraft(formKey, recordId, payloadToSave)
        setSaveStatus('saved')
      } catch (e) {
        console.warn('AutoSave quiet warning (suppressed):', e?.message || e)
        setSaveStatus('idle')
      }
    }, delayMs)

    return () => clearTimeout(handler)
  }, [formData, formKey, recordId, delayMs])

  const clearDraft = async () => {
    try {
      await draftsAPI.deleteDraft(formKey, recordId)
      setFormData(initialValues)
      setSaveStatus('saved')
    } catch (e) {
      console.warn('Failed to clear draft quietly:', e?.message || e)
    }
  }

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return { formData, setFormData, updateField, clearDraft, saveStatus }
}

export default useAutoSave
