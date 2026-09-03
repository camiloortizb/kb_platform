import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rykfqebqdvunwxqkheex.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5a2ZxZWJxZHZ1bnd4cWtoZWV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODIyOTg1OSwiZXhwIjoyMTAzODA1ODU5fQ.NCpBUHYAUSME_EjCeo6hyNGv4LkpLg9B6XCqY4LkYBM'

export const supabase = createClient(supabaseUrl, supabaseKey)
