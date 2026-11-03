import Foundation
import TerminalCore

var checks = 0
@MainActor func check(_ value: Bool, _ label: String) {
    guard value else { fatalError("Failed: \(label)") }
    checks += 1
}
@MainActor func rejects(_ label: String, _ body: () throws -> Void) {
    do { try body(); fatalError("Expected rejection: \(label)") }
    catch is TerminalLabError { checks += 1 }
    catch { fatalError("Unexpected error: \(error)") }
}
let request = NiceLabRequest(amount: 15000, catid: "TEST000001", businessNumber: "0000000000", oid: "TEST000001", state: "11111111-1111-4111-8111-111111111111")
let url = try request.url()
check(url.scheme == "apppos" && url.host == "pay", "vendor route")
let fields = Dictionary(uniqueKeysWithValues: URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!.map { ($0.name, $0.value!) })
check(fields["price"] == "15000" && fields["gubun"] == "0100", "exact request amount")
check(URLComponents(string: fields["returnURI"]!)?.queryItems?.first?.value == request.state, "encoded callback correlation")
for amount in [0, -1, 100_000_000] {
    rejects("invalid amount") { _ = try NiceLabRequest(amount: amount, catid: request.catid, businessNumber: request.businessNumber, oid: request.oid, state: request.state).url() }
}
rejects("query injection") { _ = try NiceLabRequest(amount: 1, catid: "x&price=1", businessNumber: request.businessNumber, oid: request.oid, state: request.state).url() }
rejects("trailing newline") { _ = try NiceLabRequest(amount: 1, catid: request.catid + "\n", businessNumber: request.businessNumber, oid: request.oid, state: request.state).url() }
func callback(_ replacements: [String: String] = [:]) -> URL {
    var parts = URLComponents(string: "artimenu-terminal-lab://result")!
    parts.queryItems = ["state": request.state, "oid": request.oid, "gubun": "0101", "resultCode": "0000", "appPrice": "15000", "appNo": "TESTAPP1", "appDt": "261103120000"].merging(replacements) { _, new in new }.map { URLQueryItem(name: $0.key, value: $0.value) }
    return parts.url!
}
check(try NiceLabCallback(url: callback(), expected: request).requiresProviderVerification, "callback never marks paid")
check(try NiceLabCallback(url: callback(["resultCode": "9999"]), expected: request).requiresProviderVerification, "failed callback requires reconciliation")
for patch in [["state": "wrong"], ["oid": "OTHER00001"], ["appPrice": "1"], ["gubun": "0401"], ["resultCode": "0000\n"]] {
    rejects("mismatched callback") { _ = try NiceLabCallback(url: callback(patch), expected: request) }
}
for raw in [callback().absoluteString + "&resultCode=0000", callback().absoluteString + "#fragment", callback().absoluteString.replacingOccurrences(of: "://result?", with: "://result:80?")] {
    rejects("invalid callback address") { _ = try NiceLabCallback(url: URL(string: raw)!, expected: request) }
}
print("TerminalCore: \(checks) checks passed; no app launch, network or payment execution.")
