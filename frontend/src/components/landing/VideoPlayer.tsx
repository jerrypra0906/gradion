'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  videoUrl?: string;
  videoId?: string; // For YouTube/Vimeo
  platform?: 'youtube' | 'vimeo' | 'self-hosted';
  title?: string;
  thumbnailUrl?: string;
  className?: string;
}

export function VideoPlayer({
  videoUrl,
  videoId,
  platform = 'youtube',
  title = 'Platform Overview',
  thumbnailUrl,
  className = '',
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // If no video URL/ID provided, show placeholder
  if (!videoUrl && !videoId) {
    return (
      <div className={`aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <svg
            className="w-24 h-24 text-blue-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-600 font-medium">{title}</p>
          <p className="text-sm text-gray-500 mt-2">Video coming soon</p>
        </div>
      </div>
    );
  }

  // YouTube embed
  if (platform === 'youtube' && videoId) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    return (
      <div className={`aspect-video rounded-lg overflow-hidden shadow-lg ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Vimeo embed
  if (platform === 'vimeo' && videoId) {
    const embedUrl = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
    return (
      <div className={`aspect-video rounded-lg overflow-hidden shadow-lg ${className}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Self-hosted video
  if (platform === 'self-hosted' && videoUrl) {
    return (
      <div className={`aspect-video rounded-lg overflow-hidden shadow-lg bg-black ${className}`}>
        {!isPlaying && thumbnailUrl ? (
          <div
            className="w-full h-full bg-cover bg-center cursor-pointer relative"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
            onClick={() => setIsPlaying(true)}
          >
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <div className="w-20 h-20 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition">
                <svg
                  className="w-10 h-10 text-blue-600 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <video
            controls
            autoPlay={isPlaying}
            className="w-full h-full"
            poster={thumbnailUrl}
          >
            <source src={videoUrl} type="video/mp4" />
            <source src={videoUrl} type="video/webm" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className={`aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center">
        <p className="text-gray-600 font-medium">{title}</p>
        <p className="text-sm text-gray-500 mt-2">Please configure video settings</p>
      </div>
    </div>
  );
}
