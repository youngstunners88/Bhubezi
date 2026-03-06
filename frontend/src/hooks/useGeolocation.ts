import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * useGeolocation Hook
 * 
 * A React hook for accessing and managing the browser's geolocation API.
 * Provides real-time position tracking, permission management, and coordinate
 * conversion for the Johannesburg area (app-specific 0-100 scale).
 * 
 * @returns {Object} Geolocation state and control methods
 * @returns {GeoPosition|null} position - Current geographic position
 * @returns {GeoError|null} error - Any geolocation error that occurred
 * @returns {boolean} isTracking - Whether continuous tracking is active
 * @returns {PermissionState|null} permission - Current permission state
 * @returns {Object|null} appCoords - Position converted to app coordinates (x, y 0-100)
 * @returns {Function} getCurrentPosition - Get position once (returns Promise)
 * @returns {Function} startTracking - Start continuous position tracking
 * @returns {Function} stopTracking - Stop continuous tracking
 * @returns {Function} requestPermission - Explicitly request geolocation permission
 * 
 * @example
 * const { position, error, isTracking, startTracking, stopTracking } = useGeolocation();
 * 
 * // Get position once
 * const pos = await getCurrentPosition();
 * 
 * // Start continuous tracking
 * startTracking((newPos) => console.log('New position:', newPos));
 * 
 * // Stop tracking
 * stopTracking();
 */

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  heading?: number | null;
  speed?: number | null;
}

export interface GeoError {
  code: number;
  message: string;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<GeoError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check permission status
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state);
        result.addEventListener('change', () => {
          setPermission(result.state);
        });
      });
    }
  }, []);

  // Convert geolocation coords to app coords (0-100 scale)
  const toAppCoords = useCallback((lat: number, lng: number) => {
    // Johannesburg bounds approximately:
    // Lat: -26.3 to -26.1 (y: 0 to 100)
    // Lng: 27.9 to 28.2 (x: 0 to 100)
    const x = ((lng - 27.9) / 0.3) * 100;
    const y = (1 - (lat + 26.3) / 0.2) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  }, []);

  // Get current position (one-time)
  const getCurrentPosition = useCallback((): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 0, message: 'Geolocation is not supported by your browser' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
            heading: pos.coords.heading,
            speed: pos.coords.speed
          };
          setPosition(newPosition);
          setError(null);
          resolve(newPosition);
        },
        (err) => {
          const geoError: GeoError = {
            code: err.code,
            message: err.message
          };
          setError(geoError);
          reject(geoError);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }, []);

  // Start continuous tracking
  const startTracking = useCallback((onUpdate?: (pos: GeoPosition) => void) => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocation is not supported' });
      return false;
    }

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPosition: GeoPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        };
        setPosition(newPosition);
        setError(null);
        onUpdate?.(newPosition);
      },
      (err) => {
        setError({ code: err.code, message: err.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    setIsTracking(true);
    return true;
  }, []);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Request permission explicitly
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      await getCurrentPosition();
      return true;
    } catch {
      return false;
    }
  }, [getCurrentPosition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    position,
    error,
    isTracking,
    permission,
    appCoords: position ? toAppCoords(position.latitude, position.longitude) : null,
    getCurrentPosition,
    startTracking,
    stopTracking,
    requestPermission
  };
}

export default useGeolocation;
