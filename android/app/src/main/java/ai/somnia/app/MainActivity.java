package ai.somnia.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom Capacitor plugins before calling super
        registerPlugin(NativeAlarmPlugin.class);

        super.onCreate(savedInstanceState);
    }
}
