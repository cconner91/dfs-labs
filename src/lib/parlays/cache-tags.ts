// Shared cache tag, split into its own module so nfl-data.ts and odds-data.ts (which import
// from each other) don't form a circular dependency by both defining/importing it from one another.
export const NFL_DATA_CACHE_TAG = "nfl-data";
