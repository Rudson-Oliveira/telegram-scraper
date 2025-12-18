import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('🔧 Configurando banco de dados Supabase...');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('');
    console.log('🔍 Verificando tabelas existentes...');
    
    const tables = ['users', 'telegram_credentials', 'telegram_channels', 'telegram_messages', 'scraping_history'];
    
    const existingTables: string[] = [];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table}: NÃO EXISTE`);
          missingTables.push(table);
        } else {
          console.log(`   ✅ ${table}: EXISTE (${count} registros)`);
          existingTables.push(table);
        }
      } catch (err: any) {
        console.log(`   ❌ ${table}: NÃO EXISTE`);
        missingTables.push(table);
      }
    }
    
    console.log('');
    console.log('📊 Resumo:');
    console.log('   ✅ Tabelas existentes:', existingTables.length);
    console.log('   ❌ Tabelas faltando:', missingTables.length);
    
    if (missingTables.length > 0) {
      console.log('');
      console.log('⚠️  ATENÇÃO: Algumas tabelas não existem!');
      console.log('📝 Tabelas faltando:', missingTables.join(', '));
      console.log('');
      console.log('🔧 Para criar as tabelas, execute o SQL manualmente:');
      console.log('   1. Acesse: https://supabase.com/dashboard/project/whcqfemvlzpuivqxmtua/sql/new');
      console.log('   2. Cole o conteúdo de: /home/ubuntu/telegram-scraper/supabase_compact.sql');
      console.log('   3. Execute o script');
    } else {
      console.log('');
      console.log('✅ Todas as tabelas estão criadas!');
      
      // Verificar se há usuário padrão
      console.log('');
      console.log('👤 Verificando usuário padrão...');
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('openId', 'default-user');
      
      if (userError) {
        console.log('   ❌ Erro ao verificar usuário:', userError.message);
      } else if (!users || users.length === 0) {
        console.log('   ⚠️  Usuário padrão não encontrado. Criando...');
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            openId: 'default-user',
            name: 'Usuário Padrão',
            email: 'user@example.com',
            role: 'admin'
          });
        
        if (insertError) {
          console.log('   ❌ Erro ao criar usuário:', insertError.message);
        } else {
          console.log('   ✅ Usuário padrão criado com sucesso!');
        }
      } else {
        console.log('   ✅ Usuário padrão existe (ID:', users[0].id, ')');
      }
    }
    
    console.log('');
    console.log('✅ Verificação concluída!');
    
  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

setupDatabase();
