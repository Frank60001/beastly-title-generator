// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://pposapviksauvpakedxq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwb3NhcHZpa3NhdXZwYWtlZHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxODEwNzYsImV4cCI6MjA1NTc1NzA3Nn0.USIY8sH5x1w5xmN641IkeFLtDtj5i9Zr5amAtU8KYpU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);