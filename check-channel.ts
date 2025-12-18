import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkChannel() {
  console.log('🔍 Verificando canal adicionado...\n');
  
  const { data, error } = await supabase
    .from('telegram_channels')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(5);
  
  if (error) {
    console.error('❌ Erro:', error.message);
    return;
  }
  
  console.log('📋 Últimos 5 canais adicionados:');
  console.log(JSON.stringify(data, null, 2));
}

checkChannel();
