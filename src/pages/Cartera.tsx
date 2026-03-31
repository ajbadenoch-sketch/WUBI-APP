export default function Cartera() {
  return (
    <div className="px-5 pt-14 pb-6">
      <h1 className="text-2xl font-bold" style={{ color: '#1B4332' }}>
        Cartera
      </h1>
      <div
        className="mt-6 rounded-2xl p-8 flex flex-col items-center gap-2"
        style={{ backgroundColor: '#EDE8DF' }}
      >
        <span className="text-3xl">💳</span>
        <p className="text-sm font-medium" style={{ color: '#1B4332', opacity: 0.5 }}>
          Agrega tus cuentas y tarjetas
        </p>
      </div>
    </div>
  )
}
