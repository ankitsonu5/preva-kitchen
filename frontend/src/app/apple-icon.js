import { ImageResponse } from 'next/og';

// iOS home-screen icon (also used as a large brand icon in the web manifest).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #1c1812 0%, #0a0907 50%, #241f17 100%)'
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            borderRadius: '50%',
            border: '6px solid #C5A059',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 92,
              fontWeight: 900,
              color: '#D4AF37',
              lineHeight: 1,
              marginTop: 8
            }}
          >
            P
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
