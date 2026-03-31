export interface DefaultCategory {
  id: string
  nombre: string
  icono: string
  tipo: 'ingreso' | 'gasto'
}

export const GASTO_CATEGORIES: DefaultCategory[] = [
  { id: 'cat-retiro', nombre: 'Retiro de cajero', icono: '🏧', tipo: 'gasto' },
  { id: 'cat-vivienda', nombre: 'Vivienda', icono: '🏠', tipo: 'gasto' },
  { id: 'cat-servicios-hogar', nombre: 'Servicios del hogar', icono: '🔌', tipo: 'gasto' },
  { id: 'cat-transporte', nombre: 'Transporte', icono: '🚗', tipo: 'gasto' },
  { id: 'cat-alimentacion', nombre: 'Alimentación', icono: '🍽️', tipo: 'gasto' },
  { id: 'cat-salud', nombre: 'Salud', icono: '🏥', tipo: 'gasto' },
  { id: 'cat-entretenimiento', nombre: 'Entretenimiento', icono: '🎬', tipo: 'gasto' },
  { id: 'cat-finanzas', nombre: 'Finanzas personales', icono: '💰', tipo: 'gasto' },
  { id: 'cat-trabajo', nombre: 'Trabajo/Negocio', icono: '💼', tipo: 'gasto' },
  { id: 'cat-educacion', nombre: 'Educación/Capacitación', icono: '📚', tipo: 'gasto' },
  { id: 'cat-compromisos', nombre: 'Compromisos Financieros', icono: '📋', tipo: 'gasto' },
]

export const INGRESO_CATEGORIES: DefaultCategory[] = [
  { id: 'cat-salario', nombre: 'Salario/Nómina', icono: '💵', tipo: 'ingreso' },
  { id: 'cat-freelance', nombre: 'Freelance', icono: '💻', tipo: 'ingreso' },
  { id: 'cat-ventas', nombre: 'Ventas', icono: '🛍️', tipo: 'ingreso' },
  { id: 'cat-transferencia', nombre: 'Transferencia recibida', icono: '🔄', tipo: 'ingreso' },
  { id: 'cat-inversiones', nombre: 'Inversiones/Rendimientos', icono: '📈', tipo: 'ingreso' },
]
