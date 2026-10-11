const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL || 'https://whnxqubvxgjuinvrjheg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dummy_anon_key';

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  realtime: {
    transport: WebSocket
  }
};

/**
 * Cria ou recupera o cliente Supabase.
 * Se uma requisição com header Authorization for passada, injeta o token JWT para honrar as regras do RLS.
 * @param {import('express').Request} [req]
 */
function getSupabaseClient(req) {
  const authHeader = req?.headers?.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    return createClient(supabaseUrl, supabaseKey, {
      ...clientOptions,
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    });
  }

  return createClient(supabaseUrl, supabaseKey, clientOptions);
}

const defaultClient = createClient(supabaseUrl, supabaseKey, clientOptions);

module.exports = {
  getSupabaseClient,
  supabase: defaultClient
};
