import Foundation
import Translation

struct Input: Codable {
    let source_locale: String?
    let target_locale: String
    let texts: [String: String]
    let protected_terms: [String]?
}
struct Output: Codable {
    let status: String
    let source_locale: String
    let target_locale: String
    let translations: [String: String]
    let error: String?
}

@main
struct AppleTranslateJSON {
    static func protect(_ text: String, terms: [String]) -> (String, [String: String]) {
        var output = text
        var map: [String: String] = [:]
        var next = 0

        let patterns = [
            #"%(?:\d+\$)?[-.0-9]*(?:h{1,2}|l{1,2})?[dDiuUxXoOfFeEgGcCsSaApn@]"#,
            #"https?://[^\s]+"#,
        ]
        for pattern in patterns {
            let regex = try! NSRegularExpression(pattern: pattern)
            while true {
                let ns = output as NSString
                let range = NSRange(location: 0, length: ns.length)
                guard let match = regex.firstMatch(in: output, range: range) else { break }
                let original = ns.substring(with: match.range)
                let marker = "\u{E000}LSX\(next)\u{E001}"
                next += 1
                output = (output as NSString).replacingCharacters(in: match.range, with: marker)
                map[marker] = original
            }
        }

        for term in terms where !term.isEmpty {
            let escaped = NSRegularExpression.escapedPattern(for: term)
            let regex = try! NSRegularExpression(pattern: escaped, options: [.caseInsensitive])
            while true {
                let ns = output as NSString
                let range = NSRange(location: 0, length: ns.length)
                guard let match = regex.firstMatch(in: output, range: range) else { break }
                let original = ns.substring(with: match.range)
                let marker = "\u{E000}LST\(next)\u{E001}"
                next += 1
                output = (output as NSString).replacingCharacters(in: match.range, with: marker)
                map[marker] = original
            }
        }
        return (output, map)
    }

    static func restore(_ text: String, map: [String: String]) -> String {
        var output = text
        for (marker, term) in map {
            output = output.replacingOccurrences(of: marker, with: term)
        }
        return output
    }

    static func emit(_ out: Output) {
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        let d = try! enc.encode(out)
        print(String(data: d, encoding: .utf8)!)
    }

    static func main() async {
        let data = FileHandle.standardInput.readDataToEndOfFile()
        let input: Input
        do {
            input = try JSONDecoder().decode(Input.self, from: data)
        } catch {
            emit(Output(status: "invalid_input", source_locale: "en", target_locale: "", translations: [:], error: String(describing: error)))
            return
        }

        let sourceID = input.source_locale ?? "en"
        let terms = (input.protected_terms ?? []).sorted { $0.count > $1.count }
        let source = Locale.Language(identifier: sourceID)
        let target = Locale.Language(identifier: input.target_locale)
        let availability = LanguageAvailability()
        let availabilityStatus = await availability.status(from: source, to: target)
        if case .unsupported = availabilityStatus {
            emit(Output(status: "unsupported", source_locale: sourceID, target_locale: input.target_locale, translations: [:], error: nil))
            return
        }

        let session = TranslationSession(installedSource: source, target: target)
        guard await session.isReady else {
            emit(Output(status: "not_installed", source_locale: sourceID, target_locale: input.target_locale, translations: [:], error: nil))
            return
        }

        let prepared = input.texts.mapValues { protect($0, terms: terms) }
        let requests = prepared.map { key, pair in
            TranslationSession.Request(sourceText: pair.0, clientIdentifier: key)
        }
        do {
            let responses = try await session.translations(from: requests)
            var translated: [String: String] = [:]
            for response in responses {
                guard let key = response.clientIdentifier, let pair = prepared[key] else { continue }
                translated[key] = restore(response.targetText, map: pair.1)
            }
            emit(Output(
                status: translated.count == input.texts.count ? "ok" : "partial",
                source_locale: sourceID,
                target_locale: input.target_locale,
                translations: translated,
                error: nil
            ))
        } catch {
            emit(Output(status: "error", source_locale: sourceID, target_locale: input.target_locale, translations: [:], error: String(describing: error)))
        }
    }
}
