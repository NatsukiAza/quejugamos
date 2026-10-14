export function SteamLoginButton({
  returnTo,
  label,
  prominent = false,
}: {
  returnTo: string;
  label: string;
  prominent?: boolean;
}) {
  const href = `/api/auth/steam?returnTo=${encodeURIComponent(returnTo)}`;
  return (
    <a className={prominent ? "steam-login steam-login-hero" : "steam-login"} href={href}>
      {/* Valve publishes this asset for third-party sign-in. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://community.steamstatic.com/public/images/signinthroughsteam/sits_01.png"
        alt={label}
        width={prominent ? 360 : 180}
        height={prominent ? 70 : 35}
      />
    </a>
  );
}
