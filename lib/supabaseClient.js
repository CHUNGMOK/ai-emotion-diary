import { createClient } from '@supabase/supabase-js';

// Vercel 환경변수에서 Supabase URL 및 키를 가져옵니다.
// 프로덕션 환경의 환경변수를 가져왔으므로 SUPABASE_URL 등이 존재합니다.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL 또는 Key가 설정되지 않았습니다. 환경변수를 확인해주세요.');
}

// Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);
