import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eicgytjcrhrzdqhglgme.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpY2d5dGpjcmhyemRxaGdsZ21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzM4NjIsImV4cCI6MjA5NzQwOTg2Mn0.CCcwDdvtA_BRWezHRIUf-SUsJyU7i-6GwPdh09Re7lY'

export const supabase = createClient(supabaseUrl, supabaseKey)
