import { GameCover } from "./game-cover";

export function GameRow({
  name,
  imageUrl,
  meta,
  detail,
}: {
  name: string;
  imageUrl: string | null;
  meta: string;
  detail?: string;
}) {
  return (
    <article className="game-row">
      <GameCover src={imageUrl} name={name} />
      <div>
        <strong>{name}</strong>
        <p className="stat">{meta}</p>
        {detail ? <p className="muted">{detail}</p> : null}
      </div>
    </article>
  );
}
