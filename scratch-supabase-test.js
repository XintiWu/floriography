const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[key] = value.trim();
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase URL or Key not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    const { data: flowers, error: flowerError } = await supabase
      .from('flowers')
      .select('*')
      .limit(10);
    
    if (flowerError) {
      console.error('Supabase flowers error:', flowerError);
    } else {
      console.log('Supabase flowers count:', flowers.length);
      console.log('Supabase flowers sample:', flowers);
    }

    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .limit(10);
      
    if (cardsError) {
      console.error('Supabase cards error:', cardsError);
    } else {
      console.log('Supabase cards count:', cards.length);
    }
  } catch (err) {
    console.error(err);
  }
}

main();
