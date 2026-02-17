import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';

export interface BusinessEmailConfig {
  from_email: string;
  from_name: string;
  /** True if API key is set (we never return the key to client). */
  api_key_set: boolean;
}

export interface BusinessSmsConfig {
  from_number: string;
  twilio_account_sid: string;
  /** True if auth token is set (we never return the token to client). */
  auth_token_set: boolean;
}

export function useBusinessChannelConfig() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: emailConfig, isLoading: emailLoading } = useQuery({
    queryKey: ['business-email-config', business?.id],
    queryFn: async (): Promise<BusinessEmailConfig | null> => {
      if (!business?.id) return null;
      const { data, error } = await supabase
        .from('business_email_config')
        .select('from_email, from_name, resend_api_key')
        .eq('business_id', business.id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        from_email: data.from_email ?? '',
        from_name: data.from_name ?? '',
        api_key_set: !!(data as any).resend_api_key,
      };
    },
    enabled: !!business?.id,
  });

  const { data: smsConfig, isLoading: smsLoading } = useQuery({
    queryKey: ['business-sms-config', business?.id],
    queryFn: async (): Promise<BusinessSmsConfig | null> => {
      if (!business?.id) return null;
      const { data, error } = await supabase
        .from('business_sms_config')
        .select('from_number, twilio_account_sid, twilio_auth_token')
        .eq('business_id', business.id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        from_number: (data as any).from_number ?? '',
        twilio_account_sid: (data as any).twilio_account_sid ?? '',
        auth_token_set: !!(data as any).twilio_auth_token,
      };
    },
    enabled: !!business?.id,
  });

  const saveEmailMutation = useMutation({
    mutationFn: async (payload: {
      from_email: string;
      from_name: string;
      resend_api_key?: string;
    }) => {
      if (!business?.id) throw new Error('No business');
      const body: { business_id: string; from_email: string; from_name: string; resend_api_key?: string } = {
        business_id: business.id,
        from_email: payload.from_email.trim(),
        from_name: payload.from_name.trim(),
      };
      if (payload.resend_api_key != null && payload.resend_api_key.trim() !== '') {
        body.resend_api_key = payload.resend_api_key.trim();
      }
      const { data: existing } = await supabase
        .from('business_email_config')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();
      if (existing) {
        const updatePayload: Record<string, unknown> = { from_email: body.from_email, from_name: body.from_name };
        if (body.resend_api_key) updatePayload.resend_api_key = body.resend_api_key;
        const { error } = await supabase
          .from('business_email_config')
          .update(updatePayload)
          .eq('business_id', business.id);
        if (error) throw error;
        return existing;
      } else {
        if (!body.resend_api_key) throw new Error('API key is required when adding email config');
        const { data: inserted, error } = await supabase
          .from('business_email_config')
          .insert({
            business_id: business.id,
            from_email: body.from_email,
            from_name: body.from_name,
            resend_api_key: body.resend_api_key,
          })
          .select()
          .single();
        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-email-config', business?.id] });
    },
  });

  const saveSmsMutation = useMutation({
    mutationFn: async (payload: {
      from_number: string;
      twilio_account_sid: string;
      twilio_auth_token?: string;
    }) => {
      if (!business?.id) throw new Error('No business');
      const body: {
        business_id: string;
        from_number: string;
        twilio_account_sid: string;
        twilio_auth_token?: string;
      } = {
        business_id: business.id,
        from_number: payload.from_number.trim(),
        twilio_account_sid: payload.twilio_account_sid.trim(),
      };
      if (payload.twilio_auth_token != null && payload.twilio_auth_token.trim() !== '') {
        body.twilio_auth_token = payload.twilio_auth_token.trim();
      }
      const { data: existing } = await supabase
        .from('business_sms_config')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();
      if (existing) {
        const updatePayload: Record<string, unknown> = {
          from_number: body.from_number,
          twilio_account_sid: body.twilio_account_sid,
        };
        if (body.twilio_auth_token) updatePayload.twilio_auth_token = body.twilio_auth_token;
        const { error } = await supabase
          .from('business_sms_config')
          .update(updatePayload)
          .eq('business_id', business.id);
        if (error) throw error;
        return existing;
      } else {
        if (!body.twilio_auth_token) throw new Error('Auth token is required when adding SMS config');
        const { data: inserted, error } = await supabase
          .from('business_sms_config')
          .insert({
            business_id: business.id,
            from_number: body.from_number,
            twilio_account_sid: body.twilio_account_sid,
            twilio_auth_token: body.twilio_auth_token,
          })
          .select()
          .single();
        if (error) throw error;
        return inserted;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-sms-config', business?.id] });
    },
  });

  const removeEmailConfigMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) return;
      await supabase.from('business_email_config').delete().eq('business_id', business.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-email-config', business?.id] });
    },
  });

  const removeSmsConfigMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) return;
      await supabase.from('business_sms_config').delete().eq('business_id', business.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-sms-config', business?.id] });
    },
  });

  return {
    emailConfig: emailConfig ?? null,
    smsConfig: smsConfig ?? null,
    isLoading: emailLoading || smsLoading,
    saveEmail: saveEmailMutation.mutateAsync,
    saveSms: saveSmsMutation.mutateAsync,
    removeEmailConfig: removeEmailConfigMutation.mutateAsync,
    removeSmsConfig: removeSmsConfigMutation.mutateAsync,
    isSavingEmail: saveEmailMutation.isPending,
    isSavingSms: saveSmsMutation.isPending,
  };
}
