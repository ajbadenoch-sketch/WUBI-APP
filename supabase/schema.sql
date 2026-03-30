-- =============================================
-- Wubi Finance PWA - Supabase Schema
-- =============================================

-- Enums
CREATE TYPE account_tipo AS ENUM ('efectivo', 'debito', 'credito', 'ahorro', 'inversion');
CREATE TYPE transaction_tipo AS ENUM ('ingreso', 'gasto', 'transferencia');
CREATE TYPE category_tipo AS ENUM ('ingreso', 'gasto');
CREATE TYPE split_division AS ENUM ('igual', 'porcentaje', 'monto');
CREATE TYPE split_estado AS ENUM ('pendiente', 'parcial', 'completado');

-- =============================================
-- Tables
-- =============================================

-- Users (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  banco TEXT NOT NULL,
  tipo account_tipo NOT NULL,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, banco, nombre)
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  icono TEXT NOT NULL,
  tipo category_tipo NOT NULL,
  es_default BOOLEAN NOT NULL DEFAULT false,
  color TEXT NOT NULL DEFAULT '#6366f1'
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  tipo transaction_tipo NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  categoria_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  es_estimada BOOLEAN NOT NULL DEFAULT false,
  es_recurrente BOOLEAN NOT NULL DEFAULT false,
  recurrencia_id UUID
);

-- Budgets
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INT NOT NULL CHECK (anio >= 2020),
  categoria_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monto_presupuestado NUMERIC(14,2) NOT NULL CHECK (monto_presupuestado >= 0),
  UNIQUE(user_id, mes, anio, categoria_id)
);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL,
  monto_objetivo NUMERIC(14,2) NOT NULL CHECK (monto_objetivo > 0),
  monto_actual NUMERIC(14,2) NOT NULL DEFAULT 0,
  plazo_meses INT NOT NULL CHECK (plazo_meses > 0),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Debts
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acreedor TEXT NOT NULL,
  deudor TEXT NOT NULL,
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  concepto TEXT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  pagado BOOLEAN NOT NULL DEFAULT false
);

-- Splits
CREATE TABLE splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  monto_total NUMERIC(14,2) NOT NULL CHECK (monto_total > 0),
  tipo_division split_division NOT NULL DEFAULT 'igual',
  estado split_estado NOT NULL DEFAULT 'pendiente'
);

-- Split Participants
CREATE TABLE split_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  monto NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  pagado BOOLEAN NOT NULL DEFAULT false
);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_participants ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Accounts: own rows only
CREATE POLICY "accounts_select_own" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- Categories: own rows + defaults (es_default = true)
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (auth.uid() = user_id OR es_default = true);
CREATE POLICY "categories_insert_own" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions: own rows only
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets: own rows only
CREATE POLICY "budgets_select_own" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert_own" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update_own" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete_own" ON budgets FOR DELETE USING (auth.uid() = user_id);

-- Goals: own rows only
CREATE POLICY "goals_select_own" ON goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_own" ON goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own" ON goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON goals FOR DELETE USING (auth.uid() = user_id);

-- Debts: own rows only
CREATE POLICY "debts_select_own" ON debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "debts_insert_own" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debts_update_own" ON debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debts_delete_own" ON debts FOR DELETE USING (auth.uid() = user_id);

-- Splits: accessible by participants
CREATE POLICY "splits_select_participant" ON splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM split_participants sp WHERE sp.split_id = id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "splits_insert" ON splits FOR INSERT WITH CHECK (true);
CREATE POLICY "splits_update_participant" ON splits FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM split_participants sp WHERE sp.split_id = id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "splits_delete_participant" ON splits FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM split_participants sp WHERE sp.split_id = id AND sp.user_id = auth.uid()
  ));

-- Split Participants: accessible by participants of the same split
CREATE POLICY "split_participants_select" ON split_participants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM split_participants sp WHERE sp.split_id = split_id AND sp.user_id = auth.uid()
  ));
CREATE POLICY "split_participants_insert" ON split_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "split_participants_update_own" ON split_participants FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "split_participants_delete" ON split_participants FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM split_participants sp WHERE sp.split_id = split_id AND sp.user_id = auth.uid()
  ));

-- =============================================
-- Trigger: Update account saldo on transaction changes
-- =============================================

CREATE OR REPLACE FUNCTION update_account_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tipo = 'ingreso' THEN
      UPDATE accounts SET saldo = saldo + NEW.monto WHERE id = NEW.account_id;
    ELSIF NEW.tipo = 'gasto' THEN
      UPDATE accounts SET saldo = saldo - NEW.monto WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Revert old transaction
    IF OLD.tipo = 'ingreso' THEN
      UPDATE accounts SET saldo = saldo - OLD.monto WHERE id = OLD.account_id;
    ELSIF OLD.tipo = 'gasto' THEN
      UPDATE accounts SET saldo = saldo + OLD.monto WHERE id = OLD.account_id;
    END IF;
    -- Apply new transaction
    IF NEW.tipo = 'ingreso' THEN
      UPDATE accounts SET saldo = saldo + NEW.monto WHERE id = NEW.account_id;
    ELSIF NEW.tipo = 'gasto' THEN
      UPDATE accounts SET saldo = saldo - NEW.monto WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.tipo = 'ingreso' THEN
      UPDATE accounts SET saldo = saldo - OLD.monto WHERE id = OLD.account_id;
    ELSIF OLD.tipo = 'gasto' THEN
      UPDATE accounts SET saldo = saldo + OLD.monto WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_account_saldo
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_saldo();

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_fecha ON transactions(fecha);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_split_participants_split_id ON split_participants(split_id);
CREATE INDEX idx_split_participants_user_id ON split_participants(user_id);
