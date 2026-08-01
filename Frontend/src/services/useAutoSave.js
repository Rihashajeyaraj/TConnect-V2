import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook for automatic form draft saving to localStorage with visual status indicator.
 * @param {string} formKey - Unique key for the form (e.g. 'draft_lead_form')
 * @param {object} initialValues - Default values for the form
 * @param {number} delayMs - Debounce delay in milliseconds (default: 1500ms)
 */
export function useAutoSave(formKey, initialValues, delayMs = 1500) {
  const [formData, setFormData] = useState(() => {
    try {
      const savedDraft = localStorage.getItem(formKey)
      return savedDraft ? JSON.parse(savedDraft) : initialValues
    } catch (e) {
      console.warn('Failed to load draft from localStorage:', e)
      return initialValues
    }
  })

  const [saveStatus, setSaveStatus] = useState('saved') // 'saved', 'saving', 'idle'
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    setSaveStatus('saving')
    const handler = setTimeout(() => {
      try {
        localStorage.setItem(formKey, JSON.stringify(formData))
        setSaveStatus('saved')
      } catch (e) {
        console.error('AutoSave failed:', e)
        setSaveStatus('idle')
      }
    }, delayMs)

    return () => clearTimeout(handler)
  }, [formData, formKey, delayMs])

  const clearDraft = () => {
    try {
      localStorage.removeItem(formKey)
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
