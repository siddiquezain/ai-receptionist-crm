export interface SortOption<T extends string = string> {
  value: T
  label: string
  defaultDir?: "asc" | "desc"
}

export function parseSortParams<T extends string>(
  searchParams: Record<string, string | undefined>,
  options: SortOption<T>[],
  defaultSort: T
): { sort: T; dir: "asc" | "desc" } {
  const rawSort = searchParams.sort as T | undefined
  const rawDir = searchParams.dir as "asc" | "desc" | undefined
  const matchedOption = options.find((o) => o.value === rawSort)
  const sort = matchedOption ? rawSort! : defaultSort
  const defaultOption = options.find((o) => o.value === sort)
  const dir =
    rawDir === "asc" || rawDir === "desc"
      ? rawDir
      : (defaultOption?.defaultDir ?? "desc")
  return { sort, dir }
}
