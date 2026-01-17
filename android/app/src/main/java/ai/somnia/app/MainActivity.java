package ai.somnia.app;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom Capacitor plugins before calling super
        registerPlugin(NativeAlarmPlugin.class);
        registerPlugin(WidgetPlugin.class);
        registerPlugin(BatteryOptimizationPlugin.class);

        super.onCreate(savedInstanceState);

        // Enable showing over lock screen for alarm display
        setupLockScreenDisplay();
    }

    /**
     * Configure the activity to display over the lock screen when an alarm fires.
     * This ensures the user sees the Somnia alarm UI even when the phone is locked.
     * Note: We do NOT call requestDismissKeyguard() here - that would prompt for
     * PIN/password.
     * Instead we just show over the lock screen and let the user unlock after they
     * dismiss the alarm.
     */
    private void setupLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Android 8.1+ method - show over lock screen and turn screen on
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            // Fallback for older Android versions
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }
}
