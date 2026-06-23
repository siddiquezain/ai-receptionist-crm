import { FormSkeleton } from "@/components/ui/skeletons"

export default function WorkingHoursLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={7} /></div>
}
