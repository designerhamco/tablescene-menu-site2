import Foundation
import XCTest
@testable import TerminalCore

final class NiceAppPosTests: XCTestCase {
    let request = NiceLabRequest(amount: 15000, catid: "TEST000001", businessNumber: "0000000000", oid: "TEST000001", state: "11111111-1111-4111-8111-111111111111")
    func callback(_ replacements: [String: String] = [:]) -> URL {
        var parts = URLComponents(string: "artimenu-terminal-lab://result")!
        let base = ["state": request.state, "oid": request.oid, "gubun": "0101", "resultCode": "0000", "appPrice": "15000", "appNo": "TESTAPP1", "appDt": "261103120000"]
        parts.queryItems = base.merging(replacements) { _, new in new }.map { URLQueryItem(name: $0.key, value: $0.value) }
        return parts.url!
    }
    func testEncodesCallbackAndMerchantContext() throws {
        let url = try request.url()
        XCTAssertEqual(url.scheme, "apppos"); XCTAssertEqual(url.host, "pay")
        let fields = Dictionary(uniqueKeysWithValues: URLComponents(url: url, resolvingAgainstBaseURL: false)!.queryItems!.map { ($0.name, $0.value!) })
        XCTAssertEqual(fields["gubun"], "0100"); XCTAssertEqual(fields["price"], "15000")
        let nested = URLComponents(string: fields["returnURI"]!)!
        XCTAssertEqual(nested.host, "result"); XCTAssertEqual(nested.queryItems?.first?.value, request.state)
    }
    func testRejectsInvalidAmountAndIdentifiers() {
        for amount in [0, -1, 100_000_000] {
            XCTAssertThrowsError(try NiceLabRequest(amount: amount, catid: request.catid, businessNumber: request.businessNumber, oid: request.oid, state: request.state).url())
        }
        XCTAssertThrowsError(try NiceLabRequest(amount: 1, catid: "x&price=1", businessNumber: request.businessNumber, oid: request.oid, state: request.state).url())
    }
    func testSuccessfulCallbackStillRequiresProviderVerification() throws {
        let result = try NiceLabCallback(url: callback(), expected: request)
        XCTAssertEqual(result.resultCode, "0000"); XCTAssertTrue(result.requiresProviderVerification)
    }
    func testRejectsWrongStateRequestAmountAndDuplicateFields() {
        for patch in [["state": "wrong"], ["oid": "OTHER00001"], ["appPrice": "1"], ["gubun": "0401"]] {
            XCTAssertThrowsError(try NiceLabCallback(url: callback(patch), expected: request))
        }
        XCTAssertThrowsError(try NiceLabCallback(url: URL(string: callback().absoluteString + "&resultCode=0000")!, expected: request))
        XCTAssertThrowsError(try NiceLabCallback(url: URL(string: callback().absoluteString + "#fragment")!, expected: request))
    }
    func testDeclinedCallbackCannotRecordAnOrderPaymentEither() throws {
        let result = try NiceLabCallback(url: callback(["resultCode": "9999"]), expected: request)
        XCTAssertTrue(result.requiresProviderVerification)
    }
}
