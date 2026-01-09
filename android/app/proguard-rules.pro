# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ============================================================================
# Somnia Native Plugins - Keep classes needed for Capacitor bridge
# ============================================================================

# Keep all Somnia native plugin classes
-keep class ai.somnia.app.NativeAlarmPlugin { *; }
-keep class ai.somnia.app.HealthConnectPlugin { *; }
-keep class ai.somnia.app.WidgetPlugin { *; }
-keep class ai.somnia.app.BatteryOptimizationPlugin { *; }
-keep class ai.somnia.app.AlarmReceiver { *; }
-keep class ai.somnia.app.BootReceiver { *; }
-keep class ai.somnia.app.AlarmService { *; }
-keep class ai.somnia.app.SomniaWidgetProvider { *; }

# Keep Capacitor plugin annotations and methods
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod public <methods>;
}

# Health Connect SDK
-keep class androidx.health.connect.** { *; }
-keep class androidx.health.platform.** { *; }

# WorkManager
-keep class androidx.work.** { *; }
