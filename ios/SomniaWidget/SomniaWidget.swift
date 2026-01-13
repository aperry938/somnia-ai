/**
 * SomniaWidget - iOS WidgetKit Widgets for lock screen and home screen
 *
 * Widgets included:
 * 1. SomniaWidget - Displays next alarm time, sleep stats
 * 2. DreamRecordWidget - Quick action to record dreams from lock screen
 *
 * Supports iOS 16+ lock screen widgets and home screen widgets.
 * iOS 17+ supports interactive widgets with App Intents.
 *
 * SETUP REQUIRED:
 * 1. In Xcode, add a Widget Extension target named "SomniaWidget"
 * 2. Add App Group "group.ai.somnia.app" to both main app and widget targets
 * 3. Enable WidgetKit capability
 * 4. For iOS 17+ interactive: Enable App Intents capability
 */

import WidgetKit
import SwiftUI
import Intents
import AppIntents

// MARK: - Widget Data

struct SomniaWidgetEntry: TimelineEntry {
    let date: Date
    let alarmTime: String?
    let alarmLabel: String
    let avgSleepHours: Double
    let sleepScore: Int
    let streak: Int
}

// MARK: - Timeline Provider

struct SomniaWidgetProvider: TimelineProvider {

    // App Group identifier - must match main app
    private let appGroupID = "group.ai.somnia.app"

    func placeholder(in context: Context) -> SomniaWidgetEntry {
        SomniaWidgetEntry(
            date: Date(),
            alarmTime: "07:00",
            alarmLabel: "Wake up",
            avgSleepHours: 7.5,
            sleepScore: 85,
            streak: 5
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (SomniaWidgetEntry) -> ()) {
        let entry = loadWidgetData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SomniaWidgetEntry>) -> ()) {
        let entry = loadWidgetData()

        // Update every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

        completion(timeline)
    }

    private func loadWidgetData() -> SomniaWidgetEntry {
        guard let userDefaults = UserDefaults(suiteName: appGroupID) else {
            return placeholder(in: .init())
        }

        let alarmTime = userDefaults.string(forKey: "nextAlarmTime")
        let alarmLabel = userDefaults.string(forKey: "nextAlarmLabel") ?? "Alarm"
        let avgSleep = userDefaults.double(forKey: "avgSleepHours")
        let sleepScore = userDefaults.integer(forKey: "sleepScore")
        let streak = userDefaults.integer(forKey: "streak")

        return SomniaWidgetEntry(
            date: Date(),
            alarmTime: alarmTime,
            alarmLabel: alarmLabel,
            avgSleepHours: avgSleep,
            sleepScore: sleepScore,
            streak: streak
        )
    }
}

// MARK: - Widget Views

struct SomniaWidgetEntryView: View {
    var entry: SomniaWidgetProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            AccessoryCircularView(entry: entry)
        case .accessoryRectangular:
            AccessoryRectangularView(entry: entry)
        case .accessoryInline:
            AccessoryInlineView(entry: entry)
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// MARK: - Lock Screen Views (iOS 16+)

struct AccessoryCircularView: View {
    let entry: SomniaWidgetEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "alarm.fill")
                    .font(.system(size: 14))
                Text(entry.alarmTime ?? "--:--")
                    .font(.system(size: 12, weight: .semibold))
            }
        }
    }
}

struct AccessoryRectangularView: View {
    let entry: SomniaWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: "alarm.fill")
                Text("Next Alarm")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text(entry.alarmTime ?? "No alarm")
                .font(.system(size: 18, weight: .bold))

            Text(entry.alarmLabel)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AccessoryInlineView: View {
    let entry: SomniaWidgetEntry

    var body: some View {
        HStack {
            Image(systemName: "alarm.fill")
            if let alarmTime = entry.alarmTime {
                Text("Alarm \(alarmTime)")
            } else {
                Text("No alarm set")
            }
        }
    }
}

// MARK: - Home Screen Views

struct SmallWidgetView: View {
    let entry: SomniaWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.09, green: 0.13, blue: 0.24)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 8) {
                // Alarm Section
                VStack(alignment: .leading, spacing: 2) {
                    Text("NEXT ALARM")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))

                    Text(entry.alarmTime ?? "--:--")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                }

                Spacer()

                // Sleep Score
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("SCORE")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        Text(entry.sleepScore > 0 ? "\(entry.sleepScore)" : "--")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 2) {
                        Text("STREAK")
                            .font(.system(size: 9, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                        Text(entry.streak > 0 ? "\(entry.streak)d" : "--")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(14)
        }
    }
}

struct MediumWidgetView: View {
    let entry: SomniaWidgetEntry

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.18),
                    Color(red: 0.09, green: 0.13, blue: 0.24)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            HStack(spacing: 16) {
                // Left: Alarm Info
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "moon.stars.fill")
                            .foregroundColor(.purple)
                        Text("Somnia")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Next Alarm")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                        Text(entry.alarmTime ?? "--:--")
                            .font(.system(size: 32, weight: .bold))
                            .foregroundColor(.white)
                        Text(entry.alarmLabel)
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }

                Spacer()

                // Right: Sleep Stats
                VStack(alignment: .trailing, spacing: 12) {
                    StatRow(label: "Avg Sleep", value: formatSleepHours(entry.avgSleepHours))
                    StatRow(label: "Score", value: entry.sleepScore > 0 ? "\(entry.sleepScore)" : "--")
                    StatRow(label: "Streak", value: entry.streak > 0 ? "\(entry.streak) days" : "--")
                }
            }
            .padding(16)
        }
    }

    private func formatSleepHours(_ hours: Double) -> String {
        guard hours > 0 else { return "--" }
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        return "\(h)h \(m)m"
    }
}

struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(.white.opacity(0.6))
            Text(value)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Main Widget Configuration

struct SomniaAlarmWidget: Widget {
    let kind: String = "SomniaWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SomniaWidgetProvider()) { entry in
            SomniaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Somnia Sleep")
        .description("View your next alarm and sleep stats")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Dream Recording Widget

/// Entry for dream recording widget
struct DreamRecordEntry: TimelineEntry {
    let date: Date
    let isSleepTracking: Bool
}

/// Provider for dream recording widget
struct DreamRecordProvider: TimelineProvider {
    private let appGroupID = "group.ai.somnia.app"

    func placeholder(in context: Context) -> DreamRecordEntry {
        DreamRecordEntry(date: Date(), isSleepTracking: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (DreamRecordEntry) -> ()) {
        let entry = loadData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DreamRecordEntry>) -> ()) {
        let entry = loadData()
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }

    private func loadData() -> DreamRecordEntry {
        let userDefaults = UserDefaults(suiteName: appGroupID)
        let isSleepTracking = userDefaults?.bool(forKey: "isSleepTracking") ?? false
        return DreamRecordEntry(date: Date(), isSleepTracking: isSleepTracking)
    }
}

/// Dream recording widget view for lock screen
struct DreamRecordWidgetView: View {
    var entry: DreamRecordProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            DreamRecordCircularView(entry: entry)
        case .accessoryRectangular:
            DreamRecordRectangularView(entry: entry)
        case .systemSmall:
            DreamRecordSmallView(entry: entry)
        default:
            DreamRecordCircularView(entry: entry)
        }
    }
}

/// Circular lock screen widget - tap to record
struct DreamRecordCircularView: View {
    let entry: DreamRecordEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 16))
                    .foregroundColor(entry.isSleepTracking ? .green : .purple)
                Text("Dream")
                    .font(.system(size: 9, weight: .medium))
            }
        }
        .widgetURL(URL(string: "somnia://journal/new"))
    }
}

/// Rectangular lock screen widget - more detail
struct DreamRecordRectangularView: View {
    let entry: DreamRecordEntry

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "mic.circle.fill")
                .font(.system(size: 28))
                .foregroundColor(entry.isSleepTracking ? .green : .purple)

            VStack(alignment: .leading, spacing: 2) {
                Text("Record Dream")
                    .font(.system(size: 14, weight: .semibold))
                Text(entry.isSleepTracking ? "Sleep tracking active" : "Tap to capture")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetURL(URL(string: "somnia://journal/new"))
    }
}

/// Small home screen widget - prominent tap target
struct DreamRecordSmallView: View {
    let entry: DreamRecordEntry

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.16, green: 0.1, blue: 0.22),
                    Color(red: 0.22, green: 0.12, blue: 0.30)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 12) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 36))
                    .foregroundColor(entry.isSleepTracking ? .green : .purple)

                Text("Record Dream")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Text("Tap to capture")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.7))

                if entry.isSleepTracking {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 6, height: 6)
                        Text("Sleep active")
                            .font(.system(size: 10))
                            .foregroundColor(.green)
                    }
                }
            }
            .padding()
        }
        .widgetURL(URL(string: "somnia://journal/new"))
    }
}

/// Dream Recording Widget configuration
struct DreamRecordWidget: Widget {
    let kind: String = "DreamRecordWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DreamRecordProvider()) { entry in
            DreamRecordWidgetView(entry: entry)
        }
        .configurationDisplayName("Quick Dream Record")
        .description("Tap to instantly record a dream when you wake up")
        .supportedFamilies([
            .systemSmall,
            .accessoryCircular,
            .accessoryRectangular
        ])
    }
}

// MARK: - Widget Bundle

@main
struct SomniaWidgetBundle: WidgetBundle {
    var body: some Widget {
        SomniaAlarmWidget()
        DreamRecordWidget()
    }
}

// MARK: - Preview

struct SomniaWidget_Previews: PreviewProvider {
    static var previews: some View {
        SomniaWidgetEntryView(entry: SomniaWidgetEntry(
            date: Date(),
            alarmTime: "07:30",
            alarmLabel: "Wake up for work",
            avgSleepHours: 7.2,
            sleepScore: 82,
            streak: 12
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
