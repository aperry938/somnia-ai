import Foundation
import Capacitor
import AVFoundation

/**
 * AudioSessionPlugin - Configures iOS AVAudioSession for background audio playback
 *
 * CRITICAL for sleep sounds to continue playing when:
 * - Screen locks
 * - App goes to background
 * - Phone call interrupts and then ends
 *
 * Without this, WebView audio will be suspended by iOS when the app backgrounds.
 */
@objc(AudioSessionPlugin)
public class AudioSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AudioSessionPlugin"
    public let jsName = "AudioSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
    ]

    private var isConfigured = false
    private var interruptionObserver: NSObjectProtocol?
    private var routeChangeObserver: NSObjectProtocol?

    override public func load() {
        super.load()
        setupInterruptionHandling()
    }

    deinit {
        if let observer = interruptionObserver {
            NotificationCenter.default.removeObserver(observer)
        }
        if let observer = routeChangeObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    /**
     * Configure the audio session for background playback
     * Call this when starting sleep sounds or alarms
     */
    @objc func configure(_ call: CAPPluginCall) {
        let mixWithOthers = call.getBool("mixWithOthers") ?? true
        let duckOthers = call.getBool("duckOthers") ?? true

        do {
            let session = AVAudioSession.sharedInstance()

            // Build options based on parameters
            var options: AVAudioSession.CategoryOptions = [.allowBluetooth, .allowBluetoothA2DP]
            if mixWithOthers {
                options.insert(.mixWithOthers)
            }
            if duckOthers {
                options.insert(.duckOthers)
            }

            // Set category to playback - this allows audio to continue in background
            try session.setCategory(
                .playback,
                mode: .default,
                options: options
            )

            // Activate the session
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            isConfigured = true

            call.resolve([
                "configured": true,
                "category": "playback",
                "isActive": true
            ])

        } catch {
            call.reject("Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    /**
     * Set audio session active/inactive
     * Use to properly deactivate when stopping audio (good citizen behavior)
     */
    @objc func setActive(_ call: CAPPluginCall) {
        let active = call.getBool("active") ?? true

        do {
            let session = AVAudioSession.sharedInstance()

            if active {
                try session.setActive(true, options: .notifyOthersOnDeactivation)
            } else {
                // Deactivate with notification so other apps can resume
                try session.setActive(false, options: .notifyOthersOnDeactivation)
            }

            call.resolve(["active": active])

        } catch {
            // Deactivation can fail if audio is still playing - that's often OK
            if active {
                call.reject("Failed to activate audio session: \(error.localizedDescription)")
            } else {
                // Silently succeed for deactivation failures
                call.resolve(["active": false, "warning": "Deactivation failed, audio may still be playing"])
            }
        }
    }

    /**
     * Get current audio session status
     */
    @objc func getStatus(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()

        call.resolve([
            "isConfigured": isConfigured,
            "category": session.category.rawValue,
            "mode": session.mode.rawValue,
            "isOtherAudioPlaying": session.isOtherAudioPlaying,
            "outputVolume": session.outputVolume,
            "sampleRate": session.sampleRate,
            "outputLatency": session.outputLatency
        ])
    }

    // MARK: - Interruption Handling

    private func setupInterruptionHandling() {
        let session = AVAudioSession.sharedInstance()

        // Handle audio interruptions (phone calls, Siri, etc.)
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: session,
            queue: .main
        ) { [weak self] notification in
            self?.handleInterruption(notification)
        }

        // Handle route changes (headphones plugged/unplugged, Bluetooth connect/disconnect)
        routeChangeObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.routeChangeNotification,
            object: session,
            queue: .main
        ) { [weak self] notification in
            self?.handleRouteChange(notification)
        }
    }

    private func handleInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            // Audio was interrupted (phone call started, Siri activated, etc.)
            // Notify JS so it can pause/save state
            notifyListeners("interruptionBegan", data: [
                "reason": "unknown"
            ])

        case .ended:
            // Interruption ended - check if we should resume
            var shouldResume = false

            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                shouldResume = options.contains(.shouldResume)
            }

            // Reactivate audio session
            do {
                try AVAudioSession.sharedInstance().setActive(true, options: .notifyOthersOnDeactivation)
            } catch {
                print("[AudioSession] Failed to reactivate after interruption: \(error)")
            }

            // Notify JS that interruption ended so it can resume playback
            notifyListeners("interruptionEnded", data: [
                "shouldResume": shouldResume
            ])

        @unknown default:
            break
        }
    }

    private func handleRouteChange(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let reasonValue = userInfo[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }

        var reasonString: String

        switch reason {
        case .newDeviceAvailable:
            reasonString = "newDeviceAvailable"
        case .oldDeviceUnavailable:
            reasonString = "oldDeviceUnavailable"
            // Headphones unplugged - might want to pause
        case .categoryChange:
            reasonString = "categoryChange"
        case .override:
            reasonString = "override"
        case .wakeFromSleep:
            reasonString = "wakeFromSleep"
        case .noSuitableRouteForCategory:
            reasonString = "noSuitableRouteForCategory"
        case .routeConfigurationChange:
            reasonString = "routeConfigurationChange"
        default:
            reasonString = "unknown"
        }

        notifyListeners("routeChange", data: [
            "reason": reasonString
        ])
    }
}
