/**
 * LocationPickerModal.jsx
 * -----------------------
 * A reusable interactive map-based location picker modal.
 *
 * Props:
 *   isOpen          — boolean, controls visibility
 *   onClose         — callback when user closes without confirming
 *   onConfirm       — callback(lat, lng, address) when user confirms a location
 *   initialLat      — optional initial map latitude
 *   initialLng      — optional initial map longitude
 *   initialAddress  — optional initial address text pre-filled in search
 *   title           — optional modal title (default: "Pick Location on Map")
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Search, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react'
import { settingsAPI } from '../services/api.js'
import { loadGoogleMaps } from '../utils/loadGoogleMaps.js'

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat = 13.0067,
  initialLng = 80.2570,
  initialAddress = '',
  title = 'Pick Location on Map',
}) {
  const mapContainerRef = useRef(null)
  const mapRef          = useRef(null)
  const markerRef       = useRef(null)

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)

  const [searchQuery, setSearchQuery]     = useState(initialAddress)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')

  const [pickedLat, setPickedLat]         = useState(null)
  const [pickedLng, setPickedLng]         = useState(null)
  const [pickedAddress, setPickedAddress] = useState('')
  const [reverseLoading, setReverseLoading] = useState(false)

  // ── Reverse geocode helper ─────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    setPickedLat(parseFloat(lat.toFixed(7)))
    setPickedLng(parseFloat(lng.toFixed(7)))
    setReverseLoading(true)
    
    if (!window.google || !window.google.maps) {
      const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setPickedAddress(fallback)
      setSearchQuery(fallback)
      setReverseLoading(false)
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const addr = results[0].formatted_address
        setPickedAddress(addr)
        setSearchQuery(addr)
      } else {
        const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        setPickedAddress(fallback)
        setSearchQuery(fallback)
      }
      setReverseLoading(false)
    })
  }, [])

  // ── Map initialization ─────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current || !googleMapsLoaded) return

    const lat0 = initialLat || 13.0067
    const lng0 = initialLng || 80.2570
    const center = { lat: lat0, lng: lng0 }

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: center,
      zoom: 14,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
    })

    markerRef.current = marker

    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      reverseGeocode(pos.lat(), pos.lng())
    })

    map.addListener('click', (e) => {
      marker.setPosition(e.latLng)
      reverseGeocode(e.latLng.lat(), e.latLng.lng())
    })

    mapRef.current = map

    // Pre-fill if initial coords given
    if (lat0 && lng0) {
      setPickedLat(parseFloat(lat0.toFixed(7)))
      setPickedLng(parseFloat(lng0.toFixed(7)))
      if (initialAddress) setPickedAddress(initialAddress)
    }
  }, [reverseGeocode, initialLat, initialLng, initialAddress, googleMapsLoaded])

  useEffect(() => {
    if (!isOpen) return
    
    settingsAPI.getConfig()
      .then(res => {
        const key = res?.data?.google_maps_api_key
        if (key) {
          setGoogleMapsApiKey(key)
          loadGoogleMaps(key)
            .then(() => setGoogleMapsLoaded(true))
            .catch(err => console.error('Failed to load Google Maps SDK:', err))
        }
      })
      .catch(err => {
        console.warn('Failed to load config in LocationPickerModal:', err)
      })

    return () => {
      if (mapRef.current) {
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && googleMapsLoaded) {
      setTimeout(initMap, 60)
    }
  }, [isOpen, googleMapsLoaded, initMap])

  useEffect(() => {
    setSearchQuery(initialAddress || '')
    setPickedAddress(initialAddress || '')
  }, [initialAddress, isOpen])

  // ── Forward geocode ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])

    if (!window.google || !window.google.maps) {
      setSearchError('Google Maps SDK is not loaded.')
      setSearching(false)
      return
    }

    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: q }, (results, status) => {
      setSearching(false)
      if (status === 'OK' && results && results.length > 0) {
        const formattedResults = results.map(res => ({
          display_name: res.formatted_address,
          lat: res.geometry.location.lat(),
          lon: res.geometry.location.lng()
        }))
        setSearchResults(formattedResults)
      } else {
        setSearchError('No locations found. Try a more specific query or click on the map.')
      }
    })
  }

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const addr = result.display_name
    setPickedLat(parseFloat(lat.toFixed(7)))
    setPickedLng(parseFloat(lng.toFixed(7)))
    setPickedAddress(addr)
    setSearchQuery(addr)
    setSearchResults([])
    if (mapRef.current && markerRef.current) {
      const pos = { lat, lng }
      markerRef.current.setPosition(pos)
      mapRef.current.panTo(pos)
      mapRef.current.setZoom(15)
    }
  }

  const handleConfirm = () => {
    if (pickedLat == null || pickedLng == null) return
    onConfirm(pickedLat, pickedLng, pickedAddress)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', zIndex: 99999 }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
              <MapPin size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">{title}</h2>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Search an address or click on the map to drop a pin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-5 pt-3 pb-2 flex-shrink-0 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 transition">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (searchResults.length) setSearchResults([])
                  if (searchError) setSearchError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search address, landmark, city…"
                className="flex-1 bg-transparent text-xs font-semibold text-slate-700 placeholder-slate-400 outline-none"
              />
              {searching && <Loader2 size={13} className="text-blue-500 animate-spin flex-shrink-0" />}
            </div>
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-black text-xs shadow transition active:scale-95 flex items-center gap-1.5"
            >
              <Search size={12} /> Search
            </button>
          </div>

          {searchError && (
            <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold px-1">
              <AlertCircle size={12} className="flex-shrink-0" />
              {searchError}
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-3.5 py-2.5 text-[11px] text-slate-700 font-semibold hover:bg-blue-50 hover:text-blue-800 transition flex items-start gap-2 border-b border-slate-50 last:border-0"
                >
                  <MapPin size={11} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div
          ref={mapContainerRef}
          style={{ flex: 1, minHeight: '320px', position: 'relative' }}
        />

        {/* ── Confirm Footer ── */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          {pickedLat != null ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 min-w-0">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wide mb-0.5">
                  📍 Location Selected
                </p>
                {reverseLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 size={11} className="animate-spin" />
                    <span>Resolving address…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-slate-700 truncate">
                      {pickedAddress || 'Unknown address'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={reverseLoading}
                className="flex-shrink-0 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-black text-xs shadow transition active:scale-95 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                Confirm
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-semibold text-center py-1">
              Search for a location or click anywhere on the map to drop a pin.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
