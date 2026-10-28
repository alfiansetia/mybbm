import React, { useEffect, useState } from 'react';

interface ProfileAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md';
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar profil anti-rusak: URL mati/kosong (Google/Unsplash) otomatis
 * diganti inisial nama — tidak pernah tampil ikon "broken image".
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  src,
  size = 'md',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const dims = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-14 h-14 text-lg';

  if (!src || failed) {
    return (
      <div
        className={`${dims} rounded-full bg-[#006194] text-white font-extrabold flex items-center justify-center shrink-0 ${className}`}
        aria-label={name}
        title={name}
      >
        {initialsOf(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dims} rounded-full object-cover shrink-0 bg-slate-200 ${className}`}
    />
  );
};
