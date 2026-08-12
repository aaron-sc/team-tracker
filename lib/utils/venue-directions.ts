export function venueDirectionsUrl(venue: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
}): string | null {
  const query = [venue.addressLine1, venue.addressLine2, venue.city, venue.state, venue.postalCode, venue.country]
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
