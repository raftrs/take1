import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wnvbncbyrhbkbburzvzy.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudmJuY2J5cmhia2JidXJ6dnp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjY1NzEsImV4cCI6MjA5MDg0MjU3MX0.xt-8x-fqxKs9KfgkuVCBaVFos0ZHZ2rKEFu4T5VABsc'

export const supabase = createClient(url, key)
