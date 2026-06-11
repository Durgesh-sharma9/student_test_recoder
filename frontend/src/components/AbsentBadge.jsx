/**
 * AbsentBadge Component
 * 
 * Displays a circular badge with "A" for absent students
 * instead of showing 0 marks.
 */

export default function AbsentBadge() {
  return (
    <div 
      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-300"
      title="Absent"
    >
      A
    </div>
  );
}
