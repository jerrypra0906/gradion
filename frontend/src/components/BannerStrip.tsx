'use client';

import { useEffect, useState } from 'react';
import { apiClient, ApiResponse, Banner, BannerAudience } from '@/lib/api';

interface BannerStripProps {
  audience: BannerAudience;
}

export function BannerStrip({ audience }: BannerStripProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await apiClient.get<ApiResponse<Banner[]>>(
          `/banners?audience=${audience}&limit=5`
        );
        if (response.data.success) {
          const fetchedBanners = response.data.data || [];
          setBanners(fetchedBanners);
          if (fetchedBanners.length > 0) {
            console.log(`BannerStrip: Loaded ${fetchedBanners.length} banner(s) for audience "${audience}"`, fetchedBanners);
          } else {
            console.log(`BannerStrip: No banners found for audience "${audience}"`);
          }
        }
      } catch (error) {
        console.error('Failed to load banners', error);
      }
    };

    fetchBanners();
  }, [audience]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners]);

  if (banners.length === 0) {
    return null;
  }

  const active = banners[activeIndex];

  return (
    <div
      className="relative text-white shadow-md overflow-hidden"
      style={
        active.image_url
          ? {
              position: 'relative',
              width: '100%',
              paddingTop: '25%', // 4:1 aspect ratio (1/4 = 0.25 = 25%) - wider banner
              background: 'transparent',
            }
          : {
              background: 'linear-gradient(to right, #2563eb, #4f46e5)',
            }
      }
    >
      {/* Background image layer - covers entire container */}
      {active.image_url && (
        <img
          src={active.image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            zIndex: 0,
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          aria-hidden="true"
        />
      )}
      {/* Content layer - positioned absolutely to not affect container height */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-xl sm:text-2xl mb-2 drop-shadow-lg">{active.title}</p>
          <p className="text-sm sm:text-base text-white leading-relaxed whitespace-pre-line drop-shadow-md">{active.content}</p>
        </div>
          {banners.length > 1 && (
            <div className="flex gap-2 sm:ml-4">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-3 h-3 rounded-full transition-all shadow-lg ${
                    idx === activeIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to banner ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

