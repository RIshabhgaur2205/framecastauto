
COMMENT ON TABLE public.credit_ledger IS
  'Credit ledger. Writes are backend-only via service role. RESTRICTIVE policies below deny all client INSERT/UPDATE/DELETE regardless of any future permissive policy.';

CREATE POLICY "Deny client inserts on credit_ledger"
  ON public.credit_ledger AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Deny client updates on credit_ledger"
  ON public.credit_ledger AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny client deletes on credit_ledger"
  ON public.credit_ledger AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (false);
