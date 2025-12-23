export default function ActivitySidebar({ activity }) {
  return (
    <div className="w-80 border-l border-gray-800 bg-gray-950 p-4 overflow-y-auto">
      <div className="text-sm font-semibold mb-4">Activity</div>

      <div className="space-y-3">
        {activity.length === 0 && (
          <div className="text-xs text-gray-500">No activity yet</div>
        )}

        {activity.map((a) => (
          <div key={a.activityId} className="text-xs text-gray-400">
            <div className="font-medium text-gray-300">{a.action}</div>
            <div className="text-gray-500">
              {new Date(a.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
