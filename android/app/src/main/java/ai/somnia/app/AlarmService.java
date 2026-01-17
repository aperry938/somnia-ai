package ai.somnia.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

/**
 * AlarmService - Foreground service that plays alarm sounds
 * This ensures the alarm keeps playing even when the phone is locked
 */
public class AlarmService extends Service {
    private static final String TAG = "SomniaAlarm";
    private static final String CHANNEL_ID = "somnia_alarm_channel";
    private static final int NOTIFICATION_ID = 1001;

    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private boolean isPlaying = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        // Acquire wake lock to keep CPU running
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "somnia:alarmServiceWakeLock"
        );
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();

        if ("START_ALARM".equals(action)) {
            String alarmId = intent.getStringExtra("alarmId");
            String soundId = intent.getStringExtra("soundId");
            String label = intent.getStringExtra("label");
            boolean shouldVibrate = intent.getBooleanExtra("vibrate", true);

            startAlarm(alarmId, soundId, label, shouldVibrate);

        } else if ("STOP_ALARM".equals(action)) {
            stopAlarm();

        } else if ("SNOOZE_ALARM".equals(action)) {
            snoozeAlarm(intent.getStringExtra("alarmId"));
        }

        return START_NOT_STICKY;
    }

    private void startAlarm(String alarmId, String soundId, String label, boolean shouldVibrate) {
        if (isPlaying) return;

        Log.d(TAG, "Starting alarm: " + alarmId);
        isPlaying = true;

        // Acquire wake lock
        if (!wakeLock.isHeld()) {
            wakeLock.acquire(5 * 60 * 1000L); // 5 minutes max
        }

        // Start foreground with notification
        Notification notification = createAlarmNotification(alarmId, label);
        startForeground(NOTIFICATION_ID, notification);

        // Start audio playback
        playAlarmSound(soundId);

        // Start vibration
        if (shouldVibrate) {
            startVibration();
        }
    }

    private void playAlarmSound(String soundId) {
        // Skip native audio - the app's JavaScript/Web Audio handles alarm sounds
        // This prevents the system alarm from playing over the Somnia sounds
        Log.d(TAG, "Skipping native audio playback - JavaScript handles alarm sound: " + soundId);

        // Keep this code for future use if we bundle audio files in res/raw/
        /*
        try {
            Uri alarmUri = getAlarmSoundUri(soundId);

            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(this, alarmUri);

            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            mediaPlayer.setAudioAttributes(audioAttributes);
            mediaPlayer.setLooping(true);

            // Set volume to max for alarm stream
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            int maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVolume, 0);

            mediaPlayer.prepare();
            mediaPlayer.start();

            Log.d(TAG, "Alarm sound playing: " + soundId);

        } catch (Exception e) {
            Log.e(TAG, "Error playing alarm sound", e);
        }
        */
    }

    /**
     * Get the URI for the alarm sound based on soundId
     * Falls back to system default if custom sound not found
     */
    private Uri getAlarmSoundUri(String soundId) {
        // Try to get custom sound from res/raw
        if (soundId != null && !soundId.isEmpty()) {
            String resourceName = "alarm_" + soundId.toLowerCase();
            int resourceId = getResources().getIdentifier(resourceName, "raw", getPackageName());

            if (resourceId != 0) {
                Uri customUri = Uri.parse("android.resource://" + getPackageName() + "/" + resourceId);
                Log.d(TAG, "Using custom alarm sound: " + resourceName);
                return customUri;
            } else {
                Log.d(TAG, "Custom sound not found: " + resourceName + ", using system default");
            }
        }

        // Fall back to system alarm sound
        Uri systemAlarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (systemAlarm == null) {
            systemAlarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        return systemAlarm;
    }

    private void startVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = vibratorManager.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }

        // Vibration pattern: vibrate 1s, pause 0.5s, repeat
        long[] pattern = {0, 1000, 500, 1000, 500};

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            vibrator.vibrate(pattern, 0);
        }
    }

    private void stopAlarm() {
        Log.d(TAG, "Stopping alarm");
        isPlaying = false;

        // Stop audio
        if (mediaPlayer != null) {
            try {
                mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error stopping media player", e);
            }
            mediaPlayer = null;
        }

        // Stop vibration
        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }

        // Release wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }

        // Stop foreground service
        stopForeground(true);
        stopSelf();
    }

    private void snoozeAlarm(String alarmId) {
        Log.d(TAG, "Snoozing alarm: " + alarmId);
        // Snooze logic would reschedule the alarm for X minutes later
        // For now, just stop the alarm
        stopAlarm();

        // TODO: Reschedule alarm for snooze duration (e.g., 9 minutes)
    }

    private Notification createAlarmNotification(String alarmId, String label) {
        // Intent to open app when notification tapped
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Dismiss action
        Intent dismissIntent = new Intent(this, AlarmService.class);
        dismissIntent.setAction("STOP_ALARM");
        PendingIntent dismissPendingIntent = PendingIntent.getService(
            this, 1, dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Snooze action
        Intent snoozeIntent = new Intent(this, AlarmService.class);
        snoozeIntent.setAction("SNOOZE_ALARM");
        snoozeIntent.putExtra("alarmId", alarmId);
        PendingIntent snoozePendingIntent = PendingIntent.getService(
            this, 2, snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(label != null ? label : "Alarm")
            .setContentText("Time to wake up!")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(openPendingIntent)
            .setFullScreenIntent(openPendingIntent, true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPendingIntent)
            .addAction(android.R.drawable.ic_popup_reminder, "Snooze", snoozePendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Somnia Alarms",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alarm notifications that wake you up");
            channel.enableVibration(true);
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopAlarm();
        super.onDestroy();
    }
}
