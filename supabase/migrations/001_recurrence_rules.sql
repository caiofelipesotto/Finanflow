-- Migration: Create recurrence_rules table
-- Execute no SQL Editor do Supabase (https://app.supabase.com -> seu projeto -> SQL Editor)

CREATE TABLE IF NOT EXISTS recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  household_id TEXT REFERENCES public.households(id) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  category_id TEXT,
  account_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('credit', 'debit', 'pix', 'transfer', 'cash', 'investment')),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')) DEFAULT 'expense',
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_user_id ON recurrence_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_household_id ON recurrence_rules(household_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_is_active ON recurrence_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_recurrence_rules_end_date ON recurrence_rules(end_date);

-- Habilitar RLS
ALTER TABLE recurrence_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own recurrence rules" ON recurrence_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurrence rules" ON recurrence_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurrence rules" ON recurrence_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurrence rules" ON recurrence_rules
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_recurrence_rules_updated_at ON recurrence_rules;
CREATE TRIGGER update_recurrence_rules_updated_at
  BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE recurrence_rules IS 'Regras de recorrência para lançamentos automáticos mensais';
COMMENT ON COLUMN recurrence_rules.day_of_month IS 'Dia do mês em que ocorre a cobrança (1-31)';
COMMENT ON COLUMN recurrence_rules.end_date IS 'Data de fim da recorrência (null = indefinido)';
COMMENT ON COLUMN recurrence_rules.is_active IS 'Se a regra está ativa (gera lançamentos)';
