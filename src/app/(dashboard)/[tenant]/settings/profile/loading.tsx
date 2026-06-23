import { FormSkeleton } from "@/components/ui/skeletons"

export default function ProfileLoading() {
  return <div className="max-w-2xl p-6"><FormSkeleton fields={5} /></div>
}
