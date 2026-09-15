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
          background: '#050507',
          borderRadius: 10
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '2px solid #d6af55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f1d68c',
            fontFamily: 'Arial, sans-serif',
            fontSize: 26,
            fontWeight: 700
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size }
  );
}
