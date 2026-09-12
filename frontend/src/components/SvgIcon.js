export default function SvgIcon({ name, size = 18, className = '', strokeWidth = 1.8, ...props }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
    focusable: 'false',
    ...props,
  };

  switch (name) {
    case 'location':
      return (
        <svg {...commonProps}>
          <path d="M12 21s-6-6.2-6-11a6 6 0 1 1 12 0c0 4.8-6 11-6 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...commonProps}>
          <path d="M6.6 10.8a15.7 15.7 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.2 11.3 11.3 0 0 0 3.5.6 1 1 0 0 1 1 1V19a1 1 0 0 1-1 1A17 17 0 0 1 3 3a1 1 0 0 1 1-1h2.8a1 1 0 0 1 1 1 11.3 11.3 0 0 0 .6 3.5 1 1 0 0 1-.2 1l-2.2 2.2Z" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case 'camera':
      return (
        <svg {...commonProps}>
          <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2.3l1.2-2h4l1.2 2h2.3A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5Z" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'facebook':
      return (
        <svg {...commonProps}>
          <path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H8v3h3v8h3v-8h2.5l.5-3H14V8Z" />
        </svg>
      );
    case 'parking':
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9M9 13h4" />
        </svg>
      );
    case 'chef':
      return (
        <svg {...commonProps}>
          <path d="M7 10a3 3 0 0 1 6 0v3a3 3 0 0 1-6 0v-3Z" />
          <path d="M4 13c0-2.8 2.2-5 5-5h6c2.8 0 5 2.2 5 5v3c0 2.8-2.2 5-5 5H9c-2.8 0-5-2.2-5-5v-3Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...commonProps}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...commonProps}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V8a4 4 0 1 1 8 0v2" />
        </svg>
      );
    case 'star':
      return (
        <svg {...commonProps}>
          <path d="m12 3 2.2 5.1 5.5.6-4.2 3.9 1.3 5.4L12 15.8 7.2 18l1.3-5.4L4.3 8.7l5.5-.6L12 3Z" />
        </svg>
      );
    case 'spark':
      return (
        <svg {...commonProps}>
          <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
        </svg>
      );
    case 'music':
      return (
        <svg {...commonProps}>
          <path d="M9 18a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
          <path d="M11 16V5h6v2h-4v9" />
        </svg>
      );
    case 'check':
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      );
    case 'check-circle':
      return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" /></svg>;
    case 'cart':
      return <svg {...commonProps}><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M3 4h2l2.3 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6" /></svg>;
    case 'utensils':
      return <svg {...commonProps}><path d="M6 3v7M3 3v5a3 3 0 0 0 6 0V3M6 11v10M15 3v18M15 3c4 2 5 6 5 9h-5" /></svg>;
    case 'inbox':
      return <svg {...commonProps}><path d="M4 13 6 5h12l2 8v6H4v-6Z" /><path d="M4 13h5l1.5 2h3L15 13h5" /></svg>;
    case 'package':
      return <svg {...commonProps}><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="M4 7v10l8 4 8-4V7M12 11v10" /></svg>;
    case 'pickup':
    case 'bag':
      return (
        <svg {...commonProps}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'delivery':
      return <svg {...commonProps}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 18h6l-3-7H7l-1 4M11 11l3-3h3M14 8l4 10M9 7h3" /></svg>;
    case 'zap':
    case 'bolt':
      return (
        <svg {...commonProps}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'party':
      return <svg {...commonProps}><path d="m4 20 5-13 8 8-13 5Z" /><path d="m9 7 6 8M15 4l1-2M19 8l3-1M17 12l3 2M11 3l-1-2" /></svg>;
    case 'copy':
      return <svg {...commonProps}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
    case 'message':
      return <svg {...commonProps}><path d="M21 12a8 8 0 0 1-9 8 9 9 0 0 1-3.6-.8L3 21l1.8-5A8 8 0 1 1 21 12Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" /></svg>;
    case 'smartphone':
      return <svg {...commonProps}><rect x="6" y="2" width="12" height="20" rx="2" /><path d="M10 5h4M11 19h2" /></svg>;
    case 'trash':
      return <svg {...commonProps}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>;
    case 'eye':
      return <svg {...commonProps}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case 'rotate-ccw':
      return <svg {...commonProps}><path d="M3 8v5h5" /><path d="M4.5 13A8 8 0 1 0 7 5.5L3 9" /></svg>;
    case 'search':
      return <svg {...commonProps}><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></svg>;
    case 'chart':
      return <svg {...commonProps}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    case 'receipt':
      return <svg {...commonProps}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>;
    case 'credit-card':
      return <svg {...commonProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></svg>;
    case 'door':
      return <svg {...commonProps}><path d="M5 21h14M7 21V4l10-2v19M13 12h.01" /></svg>;
    case 'settings':
      return <svg {...commonProps}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>;
    case 'bell':
      return <svg {...commonProps}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>;
    case 'flame':
      return <svg {...commonProps}><path d="M12 22c4 0 7-3 7-7 0-5-3-8-7-13 0 4-3 5-3 9-1-1-2-2-2-4-2 2-3 5-3 8 0 4 4 7 8 7Z" /><path d="M12 22c2 0 3.5-1.5 3.5-3.5 0-2-1.2-3.5-3.5-6.5 0 2-2 3-2 4.5-1-.5-1.5-1.5-1.5-2.5-1 1-1.5 2.5-1.5 4.5C7 20.5 9.5 22 12 22Z" /></svg>;
    case 'plus':
      return (
        <svg {...commonProps}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'minus':
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...commonProps}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...commonProps}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    case 'close':
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'ticket':
      return (
        <svg {...commonProps}>
          <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
        </svg>
      );
    case 'parking':
      return (
        <svg {...commonProps}>
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <path d="M9 8h3.5a2.5 2.5 0 0 1 0 5H9Z" />
        </svg>
      );
    case 'info':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...commonProps}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      );
    case 'dress':
    case 'shirt':
      return (
        <svg {...commonProps}>
          <path d="M20.38 3.46 16 2l-4 3-4-3-4.38 1.46a1 1 0 0 0-.62.94v4.2a1 1 0 0 0 .62.94L6 10v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l2.38-.54a1 1 0 0 0 .62-.94v-4.2a1 1 0 0 0-.62-.94z" />
        </svg>
      );
    case 'google':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...props}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      );
    default:
      return null;
  }
}
