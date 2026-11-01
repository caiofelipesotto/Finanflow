-- Migration: Create recurrence_exceptions table
-- Permite sobrescrever o valor padrão de uma regra para um mês específico

CREATE TABLE IF NOT EXISTS recurrence_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES recurrence_rules(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rule_id, year, month)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_recurrence_exceptions_rule_id ON recurrence_exceptions(rule_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_exceptions_year_month ON recurrence_exceptions(year, month);

-- RLS
ALTER TABLE recurrence_exceptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmo usuário da regra)
CREATE POLICY "Users can view their own recurrence exceptions" ON recurrence_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recurrence_rules r
      WHERE r.id = recurrence_exceptions.rule_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own recurrence exceptions" ON recurrence_exceptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recurrence_rules r
      WHERE r.id = recurrence_exceptions.rule_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own recurrence exceptions" ON recurrence_exceptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recurrence_rules r
      WHERE r.id = recurrence_exceptions.rule_id
      AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own recurrence exceptions" ON recurrence_exceptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recurrence_rules r
      WHERE r.id = recurrence_exceptions.rule_id
      AND r.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_recurrence_exceptions_updated_at
  BEFORE UPDATE ON recurrence_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE recurrence_exceptions IS 'Exceções de valor por mês para regras de recorrência';
COMMENT ON COLUMN recurrence_exceptions.amount IS 'Valor sobrescrito para este mês específico';
