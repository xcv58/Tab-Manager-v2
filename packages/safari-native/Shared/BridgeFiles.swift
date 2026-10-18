import Foundation

// Team-prefixed macOS App Group keeps Safari data on this Mac, shared only
// between the signed host and its extension. No browser metadata is uploaded.
private final class BridgeIdentityBundle: NSObject {}

enum BridgeFiles {
    // Resolve from this signed target's plist, not the Safari host process.
    // Missing configuration fails closed rather than targeting the Debug app.
    private static let bundle = Bundle(for: BridgeIdentityBundle.self)
    static let group = bundle.object(forInfoDictionaryKey: "SafariAppGroupIdentifier") as? String ?? ""
    static let extensionID = bundle.object(forInfoDictionaryKey: "SafariExtensionIdentifier") as? String ?? ""

    static func directory() throws -> URL {
        guard !group.isEmpty, let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: group
        ) else { throw BridgeError.unavailableGroup }
        let directory = container.appendingPathComponent("Snapshots", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    static func url(profileID: String) throws -> URL {
        // Profile IDs come from Safari's native request, never from a webpage.
        guard profileID == "default" || UUID(uuidString: profileID) != nil else {
            throw BridgeError.invalidProfile
        }
        return try directory().appendingPathComponent(profileID + ".json")
    }
}

enum BridgeError: LocalizedError {
    case unavailableGroup, invalidProfile, invalidSnapshot
    var errorDescription: String? {
        switch self {
        case .unavailableGroup: return "The app and Safari extension cannot access their shared container. Check signing and App Group entitlements."
        case .invalidProfile: return "Safari returned an unrecognized profile identifier."
        case .invalidSnapshot: return "Safari profile data could not be read safely. Refresh Safari to reconnect."
        }
    }
}

struct SafariSnapshot: Codable, Identifiable {
    let schemaVersion: Int
    let profileID: String
    let generatedAt: Double
    let reason: String
    let windows: [SafariWindow]
    let excludedPrivateWindows: Int
    let result: CommandResult?
    let commandBusy: Bool?
    let bridgeBuild: String?
    var id: String { profileID }
    var date: Date { Date(timeIntervalSince1970: generatedAt / 1000) }

    func isFresh(at now: Date) -> Bool {
        generatedAt.isFinite && date <= now && now.timeIntervalSince(date) <= 45
    }

    func confirmsRefresh(requestedAt: Date, now: Date) -> Bool {
        isFresh(at: now) && date >= requestedAt
    }

    func shouldReplace(_ previous: SafariSnapshot?) -> Bool {
        generatedAt.isFinite && (previous == nil || previous!.generatedAt <= generatedAt)
    }

    func validate(for expectedProfile: String, at now: Date) throws {
        guard schemaVersion == 1, profileID == expectedProfile,
              profileID == "default" || UUID(uuidString: profileID) != nil,
              generatedAt.isFinite, generatedAt > 0, date <= now.addingTimeInterval(5),
              excludedPrivateWindows >= 0, windows.count <= 500,
              windows.reduce(0, { $0 + $1.tabs.count }) <= 10_000,
              Set(windows.map(\.id)).count == windows.count,
              windows.allSatisfy({ $0.id >= 0 }) else { throw BridgeError.invalidSnapshot }
        let tabs = windows.flatMap(\.tabs)
        guard Set(tabs.map(\.id)).count == tabs.count,
              tabs.allSatisfy({ $0.id >= 0 && $0.windowId >= 0 && $0.index >= 0 }) else {
            throw BridgeError.invalidSnapshot
        }
    }

    func confirmation(id: String, action: String, profile: String, requestedAt: Date, now: Date) -> CommandResult? {
        guard profileID == profile, confirmsRefresh(requestedAt: requestedAt, now: now),
              let result, result.id == id, result.action == action else { return nil }
        return result
    }
}

struct SafariWindow: Codable, Identifiable {
    let id: Int
    let focused: Bool
    let tabs: [SafariTab]
}

struct SafariTab: Codable, Identifiable {
    let id: Int
    let windowId: Int
    let index: Int
    let title: String
    let url: String?
    let active: Bool
    let pinned: Bool
    var displayTitle: String { title.isEmpty ? "Untitled tab" : title }

    static func duplicateIDs(in tabs: [SafariTab]) -> Set<Int> {
        // Safari supplies serialized URLs. Preserve case in paths, queries and
        // fragments; pages differing only there may contain different content.
        var seen = Set<Int>()
        let candidates = tabs.filter { $0.url?.isEmpty == false && seen.insert($0.id).inserted }
        let grouped = Dictionary(grouping: candidates) { $0.url! }
        return Set(grouped.values.flatMap { duplicates -> [Int] in
            guard duplicates.count > 1 else { return [] }
            let sorted = duplicates.sorted {
                if $0.pinned != $1.pinned { return $0.pinned }
                if $0.active != $1.active { return $0.active }
                return $0.id < $1.id
            }
            return sorted.dropFirst().map(\.id)
        })
    }
}

struct CommandResult: Codable {
    let id: String
    let action: String
    let succeeded: Int
    let errors: [String]
}

// Kept separate from App Group lookup so cache recovery can be exercised with
// temporary directories without reading any of the user's browsing metadata.
struct SnapshotCache {
    struct Read {
        let snapshots: [SafariSnapshot]
        let unreadableProfiles: Int

        func retainingProfile(_ current: String) -> String {
            // Losing a cache must never silently switch actions to another
            // profile, whose tab IDs may overlap the old selection.
            current.isEmpty ? snapshots.first?.profileID ?? "" : current
        }
    }
    private struct Entry {
        let data: Data
        let snapshot: SafariSnapshot
    }
    private var entries: [URL: Entry] = [:]

    mutating func read(from directory: URL, now: Date = Date()) throws -> Read {
        let files = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
            .filter { $0.pathExtension == "json" }
        var next: [URL: Entry] = [:]
        var unreadableProfiles = 0
        for file in files {
            do {
                let data = try Data(contentsOf: file)
                let snapshot: SafariSnapshot
                if let cached = entries[file], cached.data == data { snapshot = cached.snapshot }
                else { snapshot = try JSONDecoder().decode(SafariSnapshot.self, from: data) }
                try snapshot.validate(for: file.deletingPathExtension().lastPathComponent, at: now)
                next[file] = Entry(data: data, snapshot: snapshot)
            } catch {
                // Drop this profile's old data instead of retaining an apparently
                // fresh workspace. A bad profile cannot block healthy profiles.
                unreadableProfiles += 1
            }
        }
        entries = next
        return Read(snapshots: next.values.map(\.snapshot).sorted { $0.profileID < $1.profileID },
                    unreadableProfiles: unreadableProfiles)
    }
}
