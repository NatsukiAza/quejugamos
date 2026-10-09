export function SteamLoginButton({ returnTo, label }: { returnTo: string; label: string }) {
  const href = `/api/auth/steam?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <a className="steam-login" href={href}>
      {/* Valve publishes this asset for third-party sign-in. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://community.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
        alt={label}
        width={180}
        height={35}
      />
    </a>
  );
}
