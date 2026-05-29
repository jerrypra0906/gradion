import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Gradion — Platform ABA & Pendampingan Autisme';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #f5f3ff 100%)',
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#2563eb',
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
            }}
          >
            Gradion
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: '#0f172a',
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            Platform ABA & pendampingan autisme — Recovery is possible
          </div>
          <div style={{ fontSize: 22, color: '#64748b', marginTop: 8 }}>
            Terstruktur · Terapis & konsultan · Validasi video AI · Knowledge Hub
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
