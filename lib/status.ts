export type ViewStatus = "loading" | "error" | "empty" | "ready";

type QueryLike<T> = {
  isPending: boolean;
  isPlaceholderData?: boolean;
  isError: boolean;
  data: T | undefined;
};

// Maps a query result to the four states every card and table understands.
export function statusOf<T>(query: QueryLike<T>, isEmpty: (data: T) => boolean): ViewStatus {
  if (query.isPending || query.isPlaceholderData) return "loading";
  if (query.isError || query.data === undefined) return "error";
  return isEmpty(query.data) ? "empty" : "ready";
}
