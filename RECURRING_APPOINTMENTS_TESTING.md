# Recurring Appointments - Testing Guide

## ✅ Migration Complete
The database migration has been applied successfully. The following tables and functions are now available:
- `recurring_appointment_series` table
- `generate_recurring_appointments()` function
- `recurring_series_id` column added to `appointments` table

## 🧪 Testing Steps

### 1. Test Admin Recurring Appointment Creation

**Path:** Dashboard → Calendar → New Appointment

1. Click "New Appointment"
2. Fill in customer, service, date, and time
3. **Toggle "Recurring Appointment" switch ON**
4. Configure recurrence:
   - Pattern: Weekly or Monthly
   - Frequency: Every X weeks/months
   - End Date: Never / On Date / After Occurrences
5. Click "Create Recurring Series"
6. **Expected:** 
   - Series created successfully
   - Toast notification appears
   - Appointments are automatically generated (check Calendar view)

### 2. Test Public Booking Recurring Option

**Path:** Public Booking Page (`/book/:slug`)

1. Navigate to your business booking page
2. Select service, date, and time
3. Fill in customer details
4. In the "Booking Summary" section, toggle "Make this recurring"
5. Configure recurrence settings
6. Click "Confirm Booking"
7. **Expected:**
   - Recurring series created
   - Success message displayed
   - Appointments generated automatically

### 3. Test Recurring Series Management

**Path:** Dashboard → Calendar → Recurring Series Tab

1. Click on "Recurring Series" tab
2. View all active recurring series
3. Test actions:
   - **Pause Series:** Click menu → Pause Series
   - **Resume Series:** Click menu → Resume Series
   - **Generate Appointments:** Click menu → Generate Appointments
   - **Cancel Series:** Click menu → Cancel Series

### 4. Test Appointment Generation Logic

The `generate_recurring_appointments()` function should:
- ✅ Skip off days
- ✅ Respect business hours
- ✅ Skip dates outside business hours
- ✅ Avoid conflicts with existing appointments
- ✅ Generate up to 3 months ahead (or until end_date/max_occurrences)

**To test:**
1. Create a recurring series
2. Mark some dates as off days in Settings
3. Check that appointments are NOT generated for off days
4. Verify appointments are generated for valid dates only

### 5. Test Edge Cases

#### Weekly Pattern
- Create series: Every 1 week, starting Monday
- Verify appointments appear every Monday

#### Bi-Weekly Pattern
- Create series: Every 2 weeks, starting Monday
- Verify appointments appear every other Monday

#### Monthly Pattern
- Create series: Every 1 month, starting 15th
- Verify appointments appear on the 15th of each month

#### End Date
- Create series with end date 1 month from now
- Verify no appointments generated after end date

#### Max Occurrences
- Create series with max 5 occurrences
- Verify only 5 appointments are created

## 🔍 Verification Checklist

- [ ] Can create recurring series from admin dashboard
- [ ] Can create recurring series from public booking page
- [ ] Appointments are automatically generated
- [ ] Off days are skipped
- [ ] Business hours are respected
- [ ] Can pause/resume series
- [ ] Can cancel series
- [ ] Can manually generate appointments
- [ ] Series appears in Recurring Series tab
- [ ] Individual appointments appear in Calendar view
- [ ] Appointments are linked to series (check `recurring_series_id`)

## 🐛 Troubleshooting

### Appointments Not Generating
1. Check series status (should be 'active')
2. Verify business hours are set correctly
3. Check for off days blocking dates
4. Verify service and customer exist
5. Check Supabase logs for function errors

### Function Errors
If `generate_recurring_appointments()` fails:
1. Check Supabase Edge Functions logs
2. Verify all required fields are set
3. Check RLS policies allow access
4. Verify business_id, customer_id, service_id are valid

### UI Not Showing
1. Clear browser cache
2. Restart dev server: `npm run dev`
3. Check browser console for errors
4. Verify all components are imported correctly

## 📝 Next Steps

1. **Test all scenarios above**
2. **Monitor appointment generation** - Check Calendar view after creating series
3. **Test with real data** - Create series with actual business hours and off days
4. **Verify email notifications** - Check if confirmation emails are sent for generated appointments
5. **Test payment integration** - If payment is required, verify it works with recurring appointments

## 🎯 Success Criteria

✅ Recurring appointments feature is working when:
- Series can be created from both admin and public booking
- Appointments are automatically generated correctly
- Series can be managed (pause/resume/cancel)
- Edge cases (off days, business hours) are handled
- UI is responsive and user-friendly

---

**Note:** If you encounter any issues, check:
1. Supabase database logs
2. Browser console for errors
3. Network tab for failed API calls
4. Verify migration was applied correctly

