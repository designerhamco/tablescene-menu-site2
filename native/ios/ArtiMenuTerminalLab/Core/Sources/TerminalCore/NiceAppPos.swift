import Foundation

public enum TerminalLabError: LocalizedError {
    case invalidRequest, invalidCallback, mismatchedResult, missingApproval
    public var errorDescription: String? {
        switch self {
        case .invalidRequest: "개발용 계정·금액·요청 번호를 확인해 주세요."
        case .invalidCallback: "허용하지 않거나 중복된 결제 결과 주소입니다."
        case .mismatchedResult: "진행 중인 요청과 결제 결과가 일치하지 않습니다."
        case .missingApproval: "요청 금액과 승인 정보를 다시 확인해 주세요."
        }
    }
}

public struct NiceLabRequest: Equatable, Sendable {
    public let amount: Int
    public let catid: String
    public let businessNumber: String
    public let oid: String
    public let state: String
    public init(amount: Int, catid: String, businessNumber: String, oid: String, state: String) {
        self.amount = amount; self.catid = catid; self.businessNumber = businessNumber; self.oid = oid; self.state = state
    }
    public func url() throws -> URL {
        func matches(_ value: String, _ pattern: String) -> Bool {
            value.range(of: pattern, options: .regularExpression) == value.startIndex..<value.endIndex
        }
        guard amount > 0, amount < 100_000_000,
              matches(catid, "^[A-Za-z0-9-]{1,32}$"), matches(businessNumber, "^[0-9]{10}$"),
              matches(oid, "^[A-Za-z0-9]{10}$"), matches(state, "^[A-Za-z0-9-]{32,64}$")
        else { throw TerminalLabError.invalidRequest }
        var callback = URLComponents()
        callback.scheme = "artimenu-terminal-lab"; callback.host = "result"
        callback.queryItems = [URLQueryItem(name: "state", value: state)]
        guard let callbackURL = callback.url else { throw TerminalLabError.invalidRequest }
        var request = URLComponents()
        request.scheme = "apppos"; request.host = "pay"
        request.queryItems = [
            URLQueryItem(name: "gubun", value: "0100"), URLQueryItem(name: "price", value: String(amount)),
            URLQueryItem(name: "catid", value: catid), URLQueryItem(name: "bizno", value: businessNumber),
            URLQueryItem(name: "oid", value: oid), URLQueryItem(name: "intMon", value: "00"),
            URLQueryItem(name: "returnURI", value: callbackURL.absoluteString)
        ]
        guard let url = request.url else { throw TerminalLabError.invalidRequest }
        return url
    }
}

public struct NiceLabCallback: Equatable, Sendable {
    public let resultCode: String
    // An app callback, including its unkeyed hash, never authorizes an order update.
    public let requiresProviderVerification = true
    public init(url: URL, expected: NiceLabRequest) throws {
        guard url.absoluteString.utf8.count <= 8192,
              let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme == "artimenu-terminal-lab", parts.host == "result", parts.path.isEmpty,
              parts.user == nil, parts.password == nil, parts.port == nil, parts.fragment == nil else { throw TerminalLabError.invalidCallback }
        let items = parts.queryItems ?? []
        guard Set(items.map(\.name)).count == items.count else { throw TerminalLabError.invalidCallback }
        let fields = Dictionary(uniqueKeysWithValues: items.map { ($0.name, $0.value ?? "") })
        guard fields["state"] == expected.state, fields["oid"] == expected.oid, fields["gubun"] == "0101",
              let code = fields["resultCode"], code.utf8.count == 4, code.range(of: "^[0-9]{4}$", options: .regularExpression) != nil
        else { throw TerminalLabError.mismatchedResult }
        if code == "0000" {
            guard fields["appPrice"] == String(expected.amount), !(fields["appNo"] ?? "").isEmpty,
                  !(fields["appDt"] ?? "").isEmpty else { throw TerminalLabError.missingApproval }
        }
        resultCode = code
    }
}
