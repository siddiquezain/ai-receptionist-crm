"use client"
import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center font-sans">
          <AlertTriangle className="h-10 w-10 text-red-500" />
          <h1 className="text-lg font-semibold">Application error</h1>
          <p className="text-sm text-gray-500">Something went wrong. Please reload the page.</p>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
