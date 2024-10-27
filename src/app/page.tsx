'use client'

import Script from 'next/script'
import { useEffect, useRef, useState, useCallback } from 'react'

export default function Home() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [lat, setLat] = useState(35.6895)
  const [lng, setLng] = useState(139.6917)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<google.maps.Marker | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [triggerDistance, setTriggerDistance] = useState(1000) // デフォルトで1km
  const [latLngInput, setLatLngInput] = useState('')

  useEffect(() => {
    if (typeof window.google === 'undefined' || !mapRef.current) return

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 15,
    })

    const newMarker = new google.maps.Marker({
      position: { lat, lng },
      map: newMap,
    })

    setMap(newMap)
    setMarker(newMarker)

    const watchId = watchPosition({ lat, lng })

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [lat, lng])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      let swRegistration: ServiceWorkerRegistration;

      navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);
            swRegistration = registration; // registration を保存
            return navigator.serviceWorker.ready;
          })
          .then(() => {
            console.log('Service Worker is ready');
            return swRegistration.pushManager.getSubscription();
          })
          .then((existingSubscription) => {
            if (existingSubscription) {
              console.log('既存の購読:', existingSubscription);
              setSubscription(existingSubscription);
              return existingSubscription;
            }
            console.log('新規購読を作成します');
            return swRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            });
          })
          .then((newSubscription) => {
            console.log('購読成功:', newSubscription);
            setSubscription(newSubscription);
          })
          .catch((error) => console.error('プッシュ通知の設定中にエラーが発生しました:', error));
    }
  }, []);

  const watchPosition = useCallback((targetPosition: { lat: number, lng: number }) => {
    return navigator.geolocation.watchPosition(
        (position) => {
          const newDistance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              targetPosition.lat,
              targetPosition.lng
          )
          setDistance(newDistance)

          if (newDistance < triggerDistance && subscription) {
            sendPushNotification(`目的地まであと${newDistance.toFixed(0)}m`);
          }
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
    )
  }, [subscription, triggerDistance])

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // 地球の半径（キロメートル）

    const dLat = degToRad(lat2 - lat1);
    const dLon = degToRad(lon2 - lon1);

    const a =
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    // メートルに変換
    return R * c * 1000;
  }

  function degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newLat = parseFloat((e.currentTarget.elements.namedItem('lat') as HTMLInputElement).value)
    const newLng = parseFloat((e.currentTarget.elements.namedItem('lng') as HTMLInputElement).value)
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLat(newLat)
      setLng(newLng)
      if (map && marker) {
        map.setCenter({ lat: newLat, lng: newLng })
        marker.setPosition({ lat: newLat, lng: newLng })
      }
    }
  }

  const handleLatLngInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const [newLat, newLng] = latLngInput.split(',').map(coord => parseFloat(coord.trim()))
    if (!isNaN(newLat) && !isNaN(newLng)) {
      updateMapAndMarker(newLat, newLng)
    } else {
      console.error('Invalid latitude or longitude')
    }
  }

  const sendPushNotification = useCallback((message: string) => {
    if (subscription) {
      const payload = JSON.stringify({
        title: '目的地に近づきました',
        body: message
      });

      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'PUSH',
            payload: payload
          });
        } else {
          console.error('アクティブなService Workerが見つかりません');
        }
      }).catch(error => {
        console.error('Service Workerへのメッセージ送信に失敗しました:', error);
      });
    } else {
      console.error('プッシュ通知の購読情報がありません');
    }
  }, [subscription]);

  const updateMapAndMarker = (newLat: number, newLng: number) => {
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLat(newLat)
      setLng(newLng)
      if (map && marker) {
        map.setCenter({ lat: newLat, lng: newLng })
        marker.setPosition({ lat: newLat, lng: newLng })
      }
    }
  }

  return (
      <>
        <Script
            src={ `https://maps.googleapis.com/maps/api/js?key=${ process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }` }
            strategy="beforeInteractive"
        />
        <form onSubmit={ handleSubmit }>
          <label htmlFor="lat">緯度: </label>
          <input id="lat" type="number" name="lat" placeholder="緯度" step="any" required/>
          <label htmlFor="lng">経度: </label>
          <input id="lng" type="number" name="lng" placeholder="経度" step="any" required/>
          <button type="submit">座標を設定</button>
        </form>
        <form onSubmit={ handleLatLngInputSubmit }>
          <label htmlFor="latLng">緯度,経度（カンマ区切り）: </label>
          <input
              id="latLng"
              type="text"
              value={ latLngInput }
              onChange={ (e) => setLatLngInput(e.target.value) }
              placeholder="例: 35.6895, 139.6917"
              required
          />
          <button type="submit">座標を設定</button>
        </form>
        <div>
          <label htmlFor="trigger">通知トリガー距離 (m): </label>
          <input
              id="trigger"
              type="number"
              value={ triggerDistance }
              onChange={ (e) => setTriggerDistance(Number(e.target.value)) }
              min="1"
              step="1"
          />
        </div>
        { distance !== null && (
            <p>目的地までの距離: { distance.toFixed(0) }m</p>
        ) }
        <div ref={ mapRef } style={ { height: '400px', width: '100%' } }/>
        <div>
          <button onClick={ () => sendPushNotification('テスト送信')}>テスト通知を送信</button>
        </div>
      </>
  )
}