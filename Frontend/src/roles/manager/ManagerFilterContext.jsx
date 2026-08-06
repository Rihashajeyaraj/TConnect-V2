import React, { createContext, useContext, useState, useEffect } from 'react'

const ManagerFilterContext = createContext(null)

export const DEFAULT_FILTERS = {
  selectedExecutive: 'All',
  dateRange: 'all',
  fromDate: '',
  toDate: '',
  statusFilter: 'All',
  searchKeyword: '',
}

export function ManagerFilterProvider({ children }) {
  const [filters, setFilters] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tc_manager_global_filter')
      if (saved) {
        return { ...DEFAULT_FILTERS, ...JSON.parse(saved) }
      }
    } catch (e) {}
    return DEFAULT_FILTERS
  })

  useEffect(() => {
    try {
      sessionStorage.setItem('tc_manager_global_filter', JSON.stringify(filters))
    } catch (e) {}
  }, [filters])

  const setExecutive = (exec) => setFilters((prev) => ({ ...prev, selectedExecutive: exec }))
  const setDateRange = (range) => setFilters((prev) => ({ ...prev, dateRange: range }))
  const setFromDate = (date) => setFilters((prev) => ({ ...prev, fromDate: date, dateRange: 'custom' }))
  const setToDate = (date) => setFilters((prev) => ({ ...prev, toDate: date, dateRange: 'custom' }))
  const setStatus = (status) => setFilters((prev) => ({ ...prev, statusFilter: status }))
  const setSearchKeyword = (kw) => setFilters((prev) => ({ ...prev, searchKeyword: kw }))

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  return (
    <ManagerFilterContext.Provider
      value={{
        filters,
        setFilters,
        setExecutive,
        setDateRange,
        setFromDate,
        setToDate,
        setStatus,
        setSearchKeyword,
        resetFilters,
      }}
    >
      {children}
    </ManagerFilterContext.Provider>
  )
}

export function useManagerFilter() {
  const ctx = useContext(ManagerFilterContext)
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      filters: DEFAULT_FILTERS,
      setExecutive: () => {},
      setDateRange: () => {},
      setFromDate: () => {},
      setToDate: () => {},
      setStatus: () => {},
      setSearchKeyword: () => {},
      resetFilters: () => {},
    }
  }
  return ctx
}
