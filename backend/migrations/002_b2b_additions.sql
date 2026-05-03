-- 企業テーブルに招待コードを追加
ALTER TABLE companies ADD COLUMN company_code TEXT UNIQUE;
UPDATE companies SET company_code = substring(md5(random()::text), 1, 8) WHERE company_code IS NULL;
ALTER TABLE companies ALTER COLUMN company_code SET NOT NULL;

-- 企業管理者向けのRLSポリシー（risk_signalsはサービスキーのみ書き込み可）
ALTER TABLE risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 管理者は自社のデータのみ読める
CREATE POLICY "Admins can read own company" ON companies
    FOR SELECT USING (admin_email = auth.email());

CREATE POLICY "Admins can read own risk signals" ON risk_signals
    FOR SELECT USING (
        company_id IN (
            SELECT id FROM companies WHERE admin_email = auth.email()
        )
    );

CREATE POLICY "Employees can read own record" ON employees
    FOR SELECT USING (user_id = auth.uid());
