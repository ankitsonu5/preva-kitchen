import { ImageResponse } from 'next/og';

export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #1c1812 0%, #0a0907 50%, #241f17 100%)',
          borderRadius: 10,
        }}
      >
        {/* Outer golden ring */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid #C5A059',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(160deg, #1c1812 0%, #0a0907 50%, #241f17 100%)',
            position: 'relative',
          }}
        >
          {/* Golden "P" letter */}
          <span
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 24,
              fontWeight: 900,
              color: '#D4AF37',
              lineHeight: 1,
              marginTop: 2,
              // Gold gradient via background-clip trick not supported in og image, using solid gold
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
