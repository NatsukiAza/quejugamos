"use client";

import { useState } from "react";

export function GameCover({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="cover cover-fallback" aria-hidden="true">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    // Store headers are served by Steam's CDN and may 404.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="cover" src={src} alt="" draggable={false} onError={() => setFailed(true)} />
  );
}
