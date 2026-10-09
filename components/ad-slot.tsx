export function AdSlot() {
  if (!process.env.NEXT_PUBLIC_ADS_CLIENT) return null;
  return <aside className="panel" data-ad-client={process.env.NEXT_PUBLIC_ADS_CLIENT} />;
}
