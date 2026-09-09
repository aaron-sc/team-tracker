/** Curated list for scrim-listing server/region pickers — keeps listings filterable and
 *  comparable instead of free-text variants ("NA East" vs "NAE" vs "US East"). "Other" reveals a
 *  free-text field, same pattern as GameSelect. */
export const REGIONS = [
  "NA East",
  "NA West",
  "EU West",
  "EU East / Nordic",
  "UK & Ireland",
  "Oceania",
  "Brazil",
  "LATAM",
  "Middle East",
  "Korea",
  "Japan",
  "Southeast Asia",
  "Other",
] as const;
