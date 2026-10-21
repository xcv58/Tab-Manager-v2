// The profiling page never loads the Settings preview route. Keep its unused
// sample data out of the common browser adapter's dependency on application UI.
export const previewWindows: Array<{
  id: number
  tabs: Array<{ id: number; title: string; url: string; iconUrl: string }>
}> = []
