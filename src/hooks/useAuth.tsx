import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured. Auth features will not work.');
      setLoading(false);
      return;
    }

    try {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      // THEN check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }).catch((err) => {
        console.error('Error getting session:', err);
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } catch (err) {
      console.error('Error setting up auth:', err);
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    const baseUrl = window.location.origin;
    const targetPath = redirectTo ?? '/';
    const fullRedirect = redirectTo?.startsWith('http') ? redirectTo : `${baseUrl}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: fullRedirect,
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear UI state immediately so ProtectedRoute and /auth don’t race (UnifiedAuth was
    // redirecting back to /dashboard while session was still in React state for a frame).
    setSession(null);
    setUser(null);
    setLoading(false);
    queryClient.removeQueries({ queryKey: ['business'] });
    queryClient.removeQueries({ queryKey: ['appointments'] });
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) console.error('[useAuth] signOut:', error.message);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
