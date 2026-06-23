import { FormSkeleton } from "@/components/ui/skeletons"

export default function AISettingsLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={6} /></div>
}
