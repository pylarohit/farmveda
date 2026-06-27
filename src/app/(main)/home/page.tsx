export default function HomePage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome to your Farmveda dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Blank Placeholder Cards */}
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Weather Overview
        </div>
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Crop Insights
        </div>
        <div className="h-48 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
          Market Prices
        </div>
      </div>

      <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-400">
        Main Activity Area
      </div>
    </div>
  );
}
