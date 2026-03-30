export interface User {
  id: string
  email: string
  nombre: string
  avatar_url: string | null
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  nombre: string
  banco: string
  tipo: 'efectivo' | 'debito' | 'credito' | 'ahorro' | 'inversion'
  saldo: number
  color: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  tipo: 'ingreso' | 'gasto' | 'transferencia'
  monto: number
  categoria_id: string | null
  fecha: string
  descripcion: string | null
  es_estimada: boolean
  es_recurrente: boolean
  recurrencia_id: string | null
}

export interface Category {
  id: string
  user_id: string | null
  nombre: string
  icono: string
  tipo: 'ingreso' | 'gasto'
  es_default: boolean
  color: string
}

export interface Budget {
  id: string
  user_id: string
  mes: number
  anio: number
  categoria_id: string
  monto_presupuestado: number
}

export interface Goal {
  id: string
  user_id: string
  nombre: string
  categoria: string
  monto_objetivo: number
  monto_actual: number
  plazo_meses: number
  fecha_inicio: string
}

export interface Debt {
  id: string
  user_id: string
  acreedor: string
  deudor: string
  monto: number
  concepto: string
  fecha_vencimiento: string
  pagado: boolean
}

export interface Split {
  id: string
  workspace_id: string
  titulo: string
  monto_total: number
  tipo_division: 'igual' | 'porcentaje' | 'monto'
  estado: 'pendiente' | 'parcial' | 'completado'
}

export interface SplitParticipant {
  id: string
  split_id: string
  user_id: string
  monto: number
  pagado: boolean
}
