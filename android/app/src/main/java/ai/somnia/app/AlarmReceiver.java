package ai.somnia.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

/**
 * AlarmReceiver - Handles alarm triggers from AlarmManager
 * This runs even when the app is closed or the phone is sleeping
 */
public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "SomniaAlarm";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Alarm received!");

        // Acquire wake lock to ensure device stays awake AND screen turns on during
        // alarm
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        @SuppressWarnings("deprecation")
        PowerManager.WakeLock wakeLock = powerManager.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP | PowerManager.ON_AFTER_RELEASE,
                "somnia:alarmWakeLock");
        wakeLock.acquire(60000); // 60 seconds max

        try {
            // Extract alarm data from intent
            String alarmId = intent.getStringExtra("alarmId");
            String soundId = intent.getStringExtra("soundId");
            String label = intent.getStringExtra("label");
            boolean vibrate = intent.getBooleanExtra("vibrate", true);

            Log.d(TAG, "Triggering alarm: " + alarmId + " with sound: " + soundId);

            // Start the foreground alarm service
            Intent serviceIntent = new Intent(context, AlarmService.class);
            serviceIntent.setAction("START_ALARM");
            serviceIntent.putExtra("alarmId", alarmId);
            serviceIntent.putExtra("soundId", soundId != null ? soundId : "somnia");
            serviceIntent.putExtra("label", label != null ? label : "Alarm");
            serviceIntent.putExtra("vibrate", vibrate);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

        } finally {
            // Release wake lock after service is started
            if (wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }
}
