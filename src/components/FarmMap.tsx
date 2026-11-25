import React, { useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { ExternalLink, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLocalizedField } from '../utils/commerce';

// Exact coordinates from the Domaine Essaoudi Google Maps location
const FARM_POSITION = { lat: 33.2348877, lng: -7.207249 };
const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Essaoudi/@33.2348922,-7.2098239,949m/data=!3m2!1e3!4b1!4m6!3m5!1s0xda65d0034b0e411:0x498c2328a5475d1!8m2!3d33.2348877!4d-7.207249';

function FarmMarkerWithInfo() {
  const { lang, siteContent } = useApp();
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);
  const address = siteContent
    ? getLocalizedField(siteContent, 'address', lang)
    : 'Douar Ouled Ziane, Berrechid, Maroc';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={FARM_POSITION}
        onClick={() => setInfoOpen((prev) => !prev)}
        title="Domaine Essaoudi"
      >
        <Pin background="#3B5328" borderColor="#242B20" glyphColor="#FAF8F4" scale={1.15} />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow anchor={marker} maxWidth={260} onCloseClick={() => setInfoOpen(false)}>
          <div className="p-1 text-[#1F241D] space-y-1">
            <div className="font-semibold text-sm">
              {lang === 'ar' ? 'مزرعة السعودي' : 'Domaine Essaoudi'}
            </div>
            <p className="text-xs text-[#3D2E22] leading-snug">{address}</p>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B5328] underline pt-1"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function FarmMap() {
  const { lang, t } = useApp();
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();

  if (!apiKey) {
    return (
      <div className="h-[380px] rounded-xl border border-[#E4DDD0] bg-[#F2EDE4] flex flex-col items-center justify-center p-6 text-center space-y-3">
        <MapPin className="w-8 h-8 text-[#3B5328]" aria-hidden="true" />
        <div className="font-display text-lg font-semibold text-[#1F241D]">
          {lang === 'ar' ? 'مزرعة السعودي — الشاوية، برشيد' : 'Domaine Essaoudi — Chaouia, Berrechid'}
        </div>
        <p className="text-xs text-[#6B5B4D] tabular-nums">33.2348877, -7.207249</p>
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B5328] text-white text-xs font-semibold hover:bg-[#2D401E] transition-colors"
        >
          <span>{t.contact.openGoogleMaps}</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-[400px] w-full rounded-xl overflow-hidden border border-[#E4DDD0] bg-[#F2EDE4]">
        <APIProvider
          apiKey={apiKey}
          language={lang}
          region="MA"
          libraries={['marker']}
        >
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={FARM_POSITION}
            defaultZoom={14}
            gestureHandling="cooperative"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <FarmMarkerWithInfo />
          </GoogleMap>
        </APIProvider>
      </div>
      <div className="flex justify-end">
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B5328] hover:underline"
        >
          <span>{t.contact.openGoogleMaps}</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
