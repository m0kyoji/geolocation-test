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

    watchPosition({ lat, lng })
  }, [lat, lng])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        };

        registration.pushManager.subscribe(subscribeOptions)
            .then(setSubscription)
            .catch(error => console.error('プッシュ通知の購読に失敗しました:', error));
      });
    }
  }, []);

  const watchPosition = useCallback((targetPosition: { lat: number, lng: number }) => {
    navigator.geolocation.watchPosition(
        (position) => {
          const distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              targetPosition.lat,
              targetPosition.lng
          )

          if (distance < 1000 && subscription) { // 1km以内に近づいた場合
            sendTestPushNotification();
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
  }, [subscription])

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

  const sendTestPushNotification = useCallback(() => {
    if (subscription) {
      const payload = JSON.stringify({
        title: 'テスト通知',
        body: '目的地に近づきました！'
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

  return (
      <>
        <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
            strategy="beforeInteractive"
        />
        <form onSubmit={handleSubmit}>
          <label htmlFor="lat">緯度: </label>
          <input id="lat" type="number" name="lat" placeholder="緯度" step="any" required/>
          <label htmlFor="lng">経度: </label>
          <input id="lng" type="number" name="lng" placeholder="経度" step="any" required/>
          <button type="submit">座標を設定</button>
        </form>
        <div ref={mapRef} style={{ height: '400px', width: '100%' }}/>
        <button onClick={sendTestPushNotification}>テスト通知を送信</button>
      </>
  )
}