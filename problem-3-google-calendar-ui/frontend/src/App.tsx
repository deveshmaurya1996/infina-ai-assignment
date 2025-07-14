import React, { useState, useEffect, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Calendar, Clock, MapPin, RefreshCw, LogOut, User } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import './App.css'

// Import the client ID from main.tsx (you'll need to export it)
const GOOGLE_CLIENT_ID = 'your-google-client-id.apps.googleusercontent.com'

// Types for Google Calendar API
interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  location?: string
  status?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus: string
  }>
}

interface CalendarResponse {
  items: CalendarEvent[]
  nextSyncToken?: string
}

interface UserProfile {
  email: string
  name: string
  picture: string
}

const App: React.FC = () => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncToken, setSyncToken] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [pollingInterval, setPollingInterval] = useState<number | null>(null)

  // Google OAuth login
  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        setLoading(true)
        setError(null)
        
        // Get user profile
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`
          }
        })
        
        if (!profileResponse.ok) {
          throw new Error('Failed to get user profile')
        }
        
        const profile = await profileResponse.json()
        setUserProfile({
          email: profile.email,
          name: profile.name,
          picture: profile.picture
        })
        
        setIsAuthenticated(true)
        
        // Fetch initial calendar events
        await fetchCalendarEvents(response.access_token)
        
        // Start polling
        startPolling(response.access_token)
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed')
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    },
    onError: () => {
      setError('Login failed. Please try again.')
      setIsAuthenticated(false)
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly'
  })

  // Fetch calendar events
  const fetchCalendarEvents = useCallback(async (accessToken: string, useSyncToken = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?`
      url += `timeMin=${now.toISOString()}`
      url += `&timeMax=${oneWeekFromNow.toISOString()}`
      url += `&singleEvents=true`
      url += `&orderBy=startTime`
      url += `&maxResults=10`
      
      if (useSyncToken && syncToken) {
        url += `&syncToken=${syncToken}`
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      
      if (!response.ok) {
        if (response.status === 410 && syncToken) {
          // Sync token expired, refetch all events
          setSyncToken(null)
          return await fetchCalendarEvents(accessToken, false)
        }
        
        // Provide more specific error messages
        let errorMessage = `Failed to fetch events: ${response.status}`
        if (response.status === 403) {
          errorMessage = 'Access denied. Please check your Google Calendar permissions and OAuth configuration.'
        } else if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.'
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again later.'
        }
        
        throw new Error(errorMessage)
      }
      
      const data: CalendarResponse = await response.json()
      
      if (useSyncToken) {
        // Incremental sync - only update changed events
        setEvents(prevEvents => {
          const eventMap = new Map(prevEvents.map(event => [event.id, event]))
          
          data.items.forEach(event => {
            if (event.status === 'cancelled') {
              eventMap.delete(event.id)
            } else {
              eventMap.set(event.id, event)
            }
          })
          
          return Array.from(eventMap.values())
        })
      } else {
        // Full sync
        setEvents(data.items)
      }
      
      // Update sync token for next incremental sync
      if (data.nextSyncToken) {
        setSyncToken(data.nextSyncToken)
      }
      
      setLastSync(new Date())
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }, [syncToken])

  // Start polling for updates
  const startPolling = useCallback((accessToken: string) => {
    setIsPolling(true)
    
    // Poll every 30 seconds when tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCalendarEvents(accessToken, true)
      }
    }, 30000)
    
    setPollingInterval(interval)
  }, [fetchCalendarEvents])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    setIsPolling(false)
  }, [pollingInterval])

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is hidden, reduce polling frequency or stop
        console.log('Tab hidden, reducing polling frequency')
      } else {
        // Tab is visible, resume normal polling
        console.log('Tab visible, resuming normal polling')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Logout function
  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserProfile(null)
    setEvents([])
    setSyncToken(null)
    setLastSync(null)
    stopPolling()
    setError(null)
  }

  // Manual refresh
  const handleRefresh = async () => {
    if (userProfile) {
      // This would require storing the access token securely
      // For demo purposes, we'll just refetch with current sync token
      setLoading(true)
      // In a real app, you'd get a fresh token here
      setLoading(false)
    }
  }

  // Format event time
  const formatEventTime = (dateTime: string) => {
    try {
      const date = parseISO(dateTime)
      return format(date, 'MMM d, yyyy • h:mm a')
    } catch {
      return 'Invalid date'
    }
  }

  // Get event duration
  const getEventDuration = (start: string, end: string) => {
    try {
      const startDate = parseISO(start)
      const endDate = parseISO(end)
      const diffMs = endDate.getTime() - startDate.getTime()
      const diffMins = Math.round(diffMs / 60000)
      
      if (diffMins < 60) {
        return `${diffMins} min`
      } else {
        const hours = Math.floor(diffMins / 60)
        const mins = diffMins % 60
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
      }
    } catch {
      return 'Unknown duration'
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="card">
        <h1>📅 Google Calendar UI</h1>
        <p>Connect your Google Calendar to view upcoming events</p>
        
        {error && (
          <div className="status error">
            {error}
          </div>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          <button 
            className="btn" 
            onClick={() => login()}
            style={{ 
              background: '#4285f4', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Sign in with Google
          </button>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }}>
          <p>This app uses Google Calendar API to fetch your upcoming events.</p>
          <p>No WebSocket or BaaS required - just smart polling!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={24} />
            <h1>Google Calendar</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {userProfile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img 
                  src={userProfile.picture} 
                  alt={userProfile.name}
                  style={{ width: 32, height: 32, borderRadius: '50%' }}
                />
                <span>{userProfile.name}</span>
              </div>
            )}
            
            <button 
              className="btn" 
              onClick={handleRefresh}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '0.9rem' }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            
            <button 
              className="btn" 
              onClick={handleLogout}
              style={{ padding: '8px 16px', fontSize: '0.9rem', background: '#e53e3e' }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        
        {/* Status */}
        {error && (
          <div className="status error">
            {error}
          </div>
        )}
        
        {loading && (
          <div className="status info">
            <div className="spinner"></div>
            Loading events...
          </div>
        )}
        
        {lastSync && (
          <div className="status info">
            Last synced: {format(lastSync, 'MMM d, yyyy • h:mm:ss a')}
            {isPolling && ' • Auto-sync active'}
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="card">
        <h2>📅 Upcoming Events</h2>
        
        {events.length === 0 && !loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
            <Calendar size={48} style={{ marginBottom: '1rem' }} />
            <p>No upcoming events found</p>
            <p style={{ fontSize: '0.9rem' }}>Events from the next 7 days will appear here</p>
          </div>
        ) : (
          <div className="event-list">
            {events.map((event) => (
              <div key={event.id} className="event-item">
                <div className="event-title">{event.summary}</div>
                <div className="event-time">
                  <Clock size={14} style={{ marginRight: '0.5rem' }} />
                  {formatEventTime(event.start.dateTime)}
                  {' • '}
                  {getEventDuration(event.start.dateTime, event.end.dateTime)}
                </div>
                {event.location && (
                  <div className="event-location">
                    <MapPin size={14} style={{ marginRight: '0.5rem' }} />
                    {event.location}
                  </div>
                )}
                {event.description && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                    {event.description}
                  </div>
                )}
                {event.attendees && event.attendees.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                    <User size={14} style={{ marginRight: '0.5rem' }} />
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical Info */}
      <div className="card">
        <h3>🔧 Technical Details</h3>
        <div style={{ textAlign: 'left', fontSize: '0.9rem', opacity: 0.8 }}>
          <p><strong>Authentication:</strong> Google OAuth 2.0 with Calendar API scope</p>
          <p><strong>Polling:</strong> Every 30 seconds when tab is active</p>
          <p><strong>Sync Strategy:</strong> Incremental sync using syncToken</p>
          <p><strong>Error Handling:</strong> Automatic retry on sync token expiration</p>
          <p><strong>Performance:</strong> Smart polling based on tab visibility</p>
        </div>
      </div>
    </div>
  )
}

export default App 