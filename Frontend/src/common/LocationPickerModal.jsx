/**
 * LocationPickerModal.jsx
 * -----------------------
 * An interactive map-based location picker modal with:
 * - Google Places Autocomplete as you type
 * - Instant Geocoding on Search / Enter (automatically drops pin on top match)
 * - OpenStreetMap Nominatim Fallback search
 * - Instant "📍 Current Location" one-click button
 * - Drag-and-drop & Click-to-pin with reverse geocoding
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { MapPin, Search, CheckCircle2, X, AlertCircle, Loader2, Navigation, Crosshair } from 'lucide-react'
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
  const inputRef        = useRef(null)
  const autocompleteRef = useRef(null)

  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false)

  const [searchQuery, setSearchQuery]     = useState(initialAddress || '')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')

  const [pickedLat, setPickedLat]         = useState(null)
  const [pickedLng, setPickedLng]         = useState(null)
  const [pickedAddress, setPickedAddress] = useState('')
  const [reverseLoading, setReverseLoading] = useState(false)
  const [locatingUser, setLocatingUser]   = useState(false)

  // ── Reverse geocode helper ─────────────────────────────────────────────────
  const reverseGeocode = useCallback(async (lat, lng) => {
    const formattedLat = parseFloat(lat.toFixed(7))
    const formattedLng = parseFloat(lng.toFixed(7))
    setPickedLat(formattedLat)
    setPickedLng(formattedLng)
    setReverseLoading(true)
    
    if (!window.google || !window.google.maps) {
      const fallback = `${formattedLat.toFixed(6)}, ${formattedLng.toFixed(6)}`
      setPickedAddress(fallback)
      setSearchQuery(fallback)
      setReverseLoading(false)
      return
    }

    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const addr = results[0].formatted_address
          setPickedAddress(addr)
          setSearchQuery(addr)
        } else {
          const fallback = `${formattedLat.toFixed(6)}, ${formattedLng.toFixed(6)}`
          setPickedAddress(fallback)
          setSearchQuery(fallback)
        }
        setReverseLoading(false)
      })
    } catch {
      const fallback = `${formattedLat.toFixed(6)}, ${formattedLng.toFixed(6)}`
      setPickedAddress(fallback)
      setSearchQuery(fallback)
      setReverseLoading(false)
    }
  }, [])

  // ── Move Marker and Pan Map Helper ──────────────────────────────────────────
  const applyCoordinates = useCallback((lat, lng, address = '') => {
    const pLat = parseFloat(lat.toFixed(7))
    const pLng = parseFloat(lng.toFixed(7))
    setPickedLat(pLat)
    setPickedLng(pLng)
    if (address) {
      setPickedAddress(address)
      setSearchQuery(address)
    } else {
      reverseGeocode(lat, lng)
    }

    if (mapRef.current && markerRef.current) {
      const pos = new window.google.maps.LatLng(lat, lng)
      markerRef.current.setPosition(pos)
      mapRef.current.panTo(pos)
      mapRef.current.setZoom(16)
    }
  }, [reverseGeocode])

  // ── Map initialization ─────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || mapRef.current || !googleMapsLoaded || !window.google?.maps) return

    const lat0 = Number(initialLat) || 13.0067
    const lng0 = Number(initialLng) || 80.2570
    const center = { lat: lat0, lng: lng0 }

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: center,
      zoom: 15,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })

    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
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
      if (initialAddress) {
        setPickedAddress(initialAddress)
      } else {
        reverseGeocode(lat0, lng0)
      }
    }

    // Attach Google Places Autocomplete to the input
    if (inputRef.current && window.google.maps.places) {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'formatted_address', 'name']
        })
        autocomplete.bindTo('bounds', map)
        
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat()
            const lng = place.geometry.location.lng()
            const addr = place.formatted_address || place.name || ''
            applyCoordinates(lat, lng, addr)
            setSearchResults([])
            setSearchError('')
          }
        })
        autocompleteRef.current = autocomplete
      } catch (acErr) {
        console.warn('Google Places Autocomplete notice:', acErr)
      }
    }
  }, [reverseGeocode, applyCoordinates, initialLat, initialLng, initialAddress, googleMapsLoaded])

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

  // ── Forward geocode (Instant auto-pin on Search) ───────────────────────────
  const handleSearch = async () => {
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])

    let foundResults = []

    // 1. Try Google Maps Geocoder
    if (window.google && window.google.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder()
        const gRes = await new Promise((resolve) => {
          geocoder.geocode({ address: q }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results)
            } else {
              resolve([])
            }
          })
        })

        if (gRes.length > 0) {
          foundResults = gRes.map(res => ({
            display_name: res.formatted_address,
            lat: res.geometry.location.lat(),
            lon: res.geometry.location.lng()
          }))
        }
      } catch (gErr) {
        console.warn('Google Geocoder notice:', gErr)
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim if Google found nothing
    if (foundResults.length === 0) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          foundResults = data.map(item => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          }))
        }
      } catch (osrmErr) {
        console.warn('Nominatim search notice:', osrmErr)
      }
    }

    setSearching(false)

    if (foundResults.length > 0) {
      // Auto-pin and pan immediately to the top match!
      const topMatch = foundResults[0]
      applyCoordinates(topMatch.lat, topMatch.lon, topMatch.display_name)
      setSearchResults(foundResults)
    } else {
      setSearchError('Location not found. Try entering landmark, area name, or pin on map.')
    }
  }

  const handleSelectResult = (result) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    const addr = result.display_name
    applyCoordinates(lat, lng, addr)
    setSearchResults([])
  }

  // ── "Use My Current Location" One-Click Helper ─────────────────────────────
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setSearchError('Geolocation is not supported by your browser.')
      return
    }
    setLocatingUser(true)
    setSearchError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        applyCoordinates(lat, lng)
        setLocatingUser(false)
      },
      (err) => {
        console.warn('GPS location error:', err)
        setSearchError('Location access was denied. Please allow GPS permission.')
        setLocatingUser(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleConfirm = () => {
    if (pickedLat == null || pickedLng == null) return
    onConfirm(pickedLat, pickedLng, pickedAddress)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      style={{ background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(4px)', zIndex: 99999 }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-mgr-secondary-700 flex items-center justify-center shadow-sm text-white">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">{title}</h2>
              <p className="text-[11px] text-slate-400 font-semibold">
                Type address, select suggestion, or click on map to pin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search Bar & Current Location Button ── */}
        <div className="px-5 pt-3 pb-2 flex-shrink-0 space-y-2 bg-white">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition shadow-2xs">
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  if (searchResults.length) setSearchResults([])
                  if (searchError) setSearchError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search location, street, area, city (e.g. Anna Nagar West)..."
                className="flex-1 bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none"
              />
              {searching && <Loader2 size={13} className="text-blue-600 animate-spin flex-shrink-0" />}
            </div>

            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-extrabold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Search size={13} /> Search
            </button>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locatingUser}
              title="Use My Current GPS Location"
              className="p-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 rounded-xl font-bold text-xs transition active:scale-95 flex items-center justify-center cursor-pointer shrink-0"
            >
              {locatingUser ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <Crosshair size={15} />}
            </button>
          </div>

          {searchError && (
            <div className="flex items-center gap-1.5 text-rose-600 text-[11px] font-bold px-1 animate-in fade-in">
              <AlertCircle size={12} className="flex-shrink-0" />
              {searchError}
            </div>
          )}

          {searchResults.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-44 overflow-y-auto">
              <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Found Locations (Top match pinned):
              </div>
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(r)}
                  className="w-full text-left px-3.5 py-2 text-[11px] text-slate-700 font-semibold hover:bg-blue-50 hover:text-blue-800 transition flex items-start gap-2 border-b border-slate-50 last:border-0 cursor-pointer"
                >
                  <MapPin size={12} className="text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map Display ── */}
        <div
          ref={mapContainerRef}
          style={{ flex: 1, minHeight: '340px', position: 'relative' }}
          className="bg-slate-100"
        />

        {/* ── Confirm Footer ── */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
          {pickedLat != null ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-wide mb-0.5">
                  <CheckCircle2 size={12} />
                  <span>Pinned Location</span>
                </div>
                {reverseLoading ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Loader2 size={11} className="animate-spin text-emerald-600" />
                    <span>Resolving exact address…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-slate-800 truncate">
                      {pickedAddress || 'Selected on map'}
                    </p>
                    <p className="text-[10px] font-extrabold text-emerald-700 mt-0.5 font-mono">
                      {pickedLat.toFixed(6)}, {pickedLng.toFixed(6)}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={reverseLoading}
                className="flex-shrink-0 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                Confirm Location
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-semibold text-center py-1">
              Search an address above, click anywhere on the map, or use Current Location.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
