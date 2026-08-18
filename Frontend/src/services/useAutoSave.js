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
        await draftsAPI.saveDraft(formKey, recordId, formData)
        setSaveStatus('saved')
      } catch (e) {
        console.error('AutoSave failed:', e)
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
      console.error('Failed to clear draft:', e)
    }
  }

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return { formData, setFormData, updateField, clearDraft, saveStatus }
}

export default useAutoSave
