import type { ReactNode } from "react";
import { GameCover } from "./game-cover";

export function GameRow({
  name,
  imageUrl,
  meta,
  detail,
  className,
  children,
}: {
  name: string;
  imageUrl: string | null;
  meta?: string;
  detail?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article className={className ? `game-row ${className}` : "game-row"}>
      <GameCover src={imageUrl} name={name} />
      <div className="game-copy">
        <strong>{name}</strong>
        {meta ? <p className="stat">{meta}</p> : null}
        {detail ? <p className="muted">{detail}</p> : null}
        {children}
      </div>
    </article>
  );
}
