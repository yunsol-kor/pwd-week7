import 'dotenv/config';
import { getSupabase, throwDatabaseError } from '../src/config/supabase';

async function main(): Promise<void> {
  const { error } = await getSupabase()
    .from('restaurants')
    .select('id,name,category,location,price_range,rating,description,recommended_menu,likes,image')
    .limit(1);
  if (error) throwDatabaseError(error);
  console.log('[Supabase] restaurants 테이블 연결 확인 성공');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'DB 연결 확인 실패');
  process.exitCode = 1;
});
