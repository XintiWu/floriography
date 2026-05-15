import { supabase } from './supabase';

export const authService = {
  // 註冊
  async signUp(email: string, password: string, fullName: string) {
    if (!supabase) throw new Error('Supabase 未設定，無法註冊');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    
    if (error) throw error;
    return data;
  },

  // 登入
  async signIn(email: string, password: string) {
    if (!supabase) throw new Error('Supabase 未設定，無法登入');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  // 登出
  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // 獲取當前用戶
  async getUser() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // 同步用戶資料到 OCI 資料庫
  async syncUser(user: any) {
    if (!user) return;
    
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
        }),
      });
    } catch (err) {
      console.error('Failed to sync user to OCI:', err);
    }
  },

  // 監聽 Auth 狀態變化
  onAuthStateChange(callback: (event: any, session: any) => void) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        this.syncUser(session.user);
      }
      callback(event, session);
    });
  }
};
