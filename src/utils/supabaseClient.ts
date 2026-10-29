import { createClient } from '@supabase/supabase-js';

/**
 * Só a URL do projeto (sem /rest/v1) — o supabase-js adiciona o caminho certo
 * sozinho. A anon key é pública por natureza: quem protege os dados é a RLS.
 */
export const SUPABASE_URL = 'https://agffyfubikxdvrmmcjia.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZmZ5ZnViaWt4ZHZybW1jamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMzE5NTYsImV4cCI6MjEwODgwNzk1Nn0.QnaY4QSgE1gSnoP70aqf4CMcWv3rqLZ_bSVMvqe0Ap8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
