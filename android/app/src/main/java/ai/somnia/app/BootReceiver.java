package ai.somnia.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

/**
 * BootReceiver - Reschedules alarms after device restart
 * Alarms scheduled with AlarmManager are lost when the device reboots,
 * so we need to reschedule them from stored data
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SomniaAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Device booted - checking for alarms to reschedule");

            // The actual alarm rescheduling happens in JavaScript when the app opens
            // For now, we just log the boot event
            // In a future iteration, we could store alarm data in SharedPreferences
            // and reschedule directly here without needing to open the app

            SharedPreferences prefs = context.getSharedPreferences("SomniaAlarms", Context.MODE_PRIVATE);
            boolean hasAlarms = prefs.getBoolean("hasActiveAlarms", false);

            if (hasAlarms) {
                Log.d(TAG, "Active alarms detected - app should reschedule on next open");
                // Could show a notification reminding user to open app
                // or implement native alarm storage/rescheduling
            }
        }
    }
}
