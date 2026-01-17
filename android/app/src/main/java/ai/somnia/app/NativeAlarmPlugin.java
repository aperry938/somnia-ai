package ai.somnia.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Calendar;

/**
 * NativeAlarmPlugin - Capacitor plugin for scheduling native Android alarms
 * Uses AlarmManager for reliable alarm scheduling that works when phone is sleeping
 */
@CapacitorPlugin(name = "NativeAlarm")
public class NativeAlarmPlugin extends Plugin {
    private static final String TAG = "NativeAlarmPlugin";

    /**
     * Schedule an alarm using Android's AlarmManager
     * This will fire even when the app is closed or the phone is in Doze mode
     */
    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        String alarmId = call.getString("id");
        String time = call.getString("time"); // Format: "HH:mm"
        String soundId = call.getString("soundId", "somnia");
        String label = call.getString("label", "Alarm");
        Boolean vibrate = call.getBoolean("vibrate", true);

        if (alarmId == null || time == null) {
            call.reject("Missing required parameters: id and time");
            return;
        }

        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            // Parse time
            String[] parts = time.split(":");
            int hour = Integer.parseInt(parts[0]);
            int minute = Integer.parseInt(parts[1]);

            // Calculate trigger time
            Calendar calendar = Calendar.getInstance();
            calendar.set(Calendar.HOUR_OF_DAY, hour);
            calendar.set(Calendar.MINUTE, minute);
            calendar.set(Calendar.SECOND, 0);
            calendar.set(Calendar.MILLISECOND, 0);

            // If time has passed today, schedule for tomorrow
            if (calendar.getTimeInMillis() <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1);
            }

            // Create intent for AlarmReceiver
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.setAction("ai.somnia.app.ALARM_TRIGGER");
            intent.putExtra("alarmId", alarmId);
            intent.putExtra("soundId", soundId);
            intent.putExtra("label", label);
            intent.putExtra("vibrate", vibrate);

            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Schedule exact alarm
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ requires checking for exact alarm permission
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setAlarmClock(
                        new AlarmManager.AlarmClockInfo(calendar.getTimeInMillis(), pendingIntent),
                        pendingIntent
                    );
                } else {
                    // Fallback to inexact if permission not granted
                    alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        calendar.getTimeInMillis(),
                        pendingIntent
                    );
                    Log.w(TAG, "Exact alarm permission not granted, using inexact alarm");
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Android 6+ with Doze mode
                alarmManager.setAlarmClock(
                    new AlarmManager.AlarmClockInfo(calendar.getTimeInMillis(), pendingIntent),
                    pendingIntent
                );
            } else {
                // Older Android
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    calendar.getTimeInMillis(),
                    pendingIntent
                );
            }

            // Save alarm to SharedPreferences for boot recovery
            saveAlarmToPrefs(alarmId, time, soundId, label, vibrate);

            Log.d(TAG, "Alarm scheduled: " + alarmId + " at " + time + " (" + calendar.getTimeInMillis() + ")");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("scheduledTime", calendar.getTimeInMillis());
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    /**
     * Cancel a scheduled alarm
     */
    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        String alarmId = call.getString("id");

        if (alarmId == null) {
            call.reject("Missing required parameter: id");
            return;
        }

        try {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.setAction("ai.somnia.app.ALARM_TRIGGER");

            int requestCode = alarmId.hashCode();
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            alarmManager.cancel(pendingIntent);
            removeAlarmFromPrefs(alarmId);

            Log.d(TAG, "Alarm cancelled: " + alarmId);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
            call.reject("Failed to cancel alarm: " + e.getMessage());
        }
    }

    /**
     * Stop the currently playing alarm
     */
    @PluginMethod
    public void stopAlarm(PluginCall call) {
        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, AlarmService.class);
            serviceIntent.setAction("STOP_ALARM");
            context.startService(serviceIntent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error stopping alarm", e);
            call.reject("Failed to stop alarm: " + e.getMessage());
        }
    }

    /**
     * Snooze the currently playing alarm
     */
    @PluginMethod
    public void snoozeAlarm(PluginCall call) {
        String alarmId = call.getString("id");
        Integer minutes = call.getInt("minutes", 9);

        try {
            Context context = getContext();

            // Stop current alarm
            Intent stopIntent = new Intent(context, AlarmService.class);
            stopIntent.setAction("SNOOZE_ALARM");
            stopIntent.putExtra("alarmId", alarmId);
            context.startService(stopIntent);

            // Schedule snooze alarm
            if (alarmId != null) {
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

                Intent intent = new Intent(context, AlarmReceiver.class);
                intent.setAction("ai.somnia.app.ALARM_TRIGGER");
                intent.putExtra("alarmId", alarmId + "_snooze");
                intent.putExtra("soundId", "somnia");
                intent.putExtra("label", "Snooze");
                intent.putExtra("vibrate", true);

                int requestCode = (alarmId + "_snooze").hashCode();
                PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                long triggerTime = System.currentTimeMillis() + (minutes * 60 * 1000L);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                } else {
                    alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    );
                }

                Log.d(TAG, "Snooze scheduled for " + minutes + " minutes");
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error snoozing alarm", e);
            call.reject("Failed to snooze alarm: " + e.getMessage());
        }
    }

    /**
     * Get the currently ringing alarm (if any)
     * Used by JavaScript to detect alarm state on app launch/resume
     */
    @PluginMethod
    public void getRingingAlarm(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("SomniaAlarms", Context.MODE_PRIVATE);

            boolean isRinging = prefs.getBoolean("isRinging", false);

            JSObject result = new JSObject();
            result.put("isRinging", isRinging);

            if (isRinging) {
                result.put("alarmId", prefs.getString("ringingAlarmId", ""));
                result.put("label", prefs.getString("ringingLabel", ""));
                result.put("soundId", prefs.getString("ringingSoundId", "somnia"));
            }

            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error getting ringing alarm", e);
            JSObject result = new JSObject();
            result.put("isRinging", false);
            call.resolve(result);
        }
    }

    /**
     * Check if app has exact alarm permission (Android 12+)
     */
    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            result.put("canSchedule", alarmManager.canScheduleExactAlarms());
        } else {
            result.put("canSchedule", true);
        }

        call.resolve(result);
    }

    /**
     * Open system settings for exact alarm permission
     */
    @PluginMethod
    public void openAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            getActivity().startActivity(intent);
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    private void saveAlarmToPrefs(String id, String time, String soundId, String label, boolean vibrate) {
        SharedPreferences prefs = getContext().getSharedPreferences("SomniaAlarms", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("alarm_" + id + "_time", time);
        editor.putString("alarm_" + id + "_sound", soundId);
        editor.putString("alarm_" + id + "_label", label);
        editor.putBoolean("alarm_" + id + "_vibrate", vibrate);
        editor.putBoolean("hasActiveAlarms", true);
        editor.apply();
    }

    private void removeAlarmFromPrefs(String id) {
        SharedPreferences prefs = getContext().getSharedPreferences("SomniaAlarms", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.remove("alarm_" + id + "_time");
        editor.remove("alarm_" + id + "_sound");
        editor.remove("alarm_" + id + "_label");
        editor.remove("alarm_" + id + "_vibrate");
        editor.apply();
    }
}
