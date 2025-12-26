import { supabase } from '@/integrations/supabase/client';

/**
 * Create notifications for all business owners and admins
 */
export async function notifyBusinessUsers(
  businessId: string,
  notification: {
    title: string;
    message: string;
    type?: string;
    link?: string | null;
  }
) {
  try {
    // Get all business owners and admins
    const { data: businessUsers, error: usersError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('business_id', businessId)
      .in('role', ['owner', 'admin']);

    if (usersError || !businessUsers || businessUsers.length === 0) {
      console.error('Error fetching business users for notifications:', usersError);
      return;
    }

    // Create notifications for all business owners/admins
    const notifications = businessUsers.map(role => ({
      user_id: role.user_id,
      business_id: businessId,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      link: notification.link || null,
      read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('Error creating notifications:', insertError);
    }
  } catch (error) {
    console.error('Error in notifyBusinessUsers:', error);
    // Don't throw - notifications are non-critical
  }
}

