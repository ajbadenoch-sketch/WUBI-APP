export default function AskWubi() {
  return (
    <div className="px-5 pt-14 pb-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>
        Ask Wubi
      </h1>
      <div
        className="mt-6 rounded-2xl p-8 flex flex-col items-center gap-3"
        style={{ backgroundColor: '#EDE8DF' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black"
          style={{ backgroundColor: '#52B788', color: 'white' }}
        >
          W
        </div>
        <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
          Tu asistente financiero con IA
        </p>
        <p className="text-xs text-center" style={{ color: '#1B4332', opacity: 0.35 }}>
          Pregúntale a Wubi sobre tus gastos, presupuestos y metas financieras
        </p>
      </div>
    </div>
  )
}
