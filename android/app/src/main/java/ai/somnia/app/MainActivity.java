package ai.somnia.app;

import android.app.KeyguardManager;
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
     */
    private void setupLockScreenDisplay() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            // Android 8.1+ method
            setShowWhenLocked(true);
            setTurnScreenOn(true);

            // Request to dismiss keyguard (shows unlock prompt after interacting)
            KeyguardManager keyguardManager = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            // Fallback for older Android versions
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }
}
