import SwiftUI
import UIKit
import TerminalCore

@main struct ArtiMenuTerminalLabApp: App {
    var body: some Scene { WindowGroup { TerminalLabView() } }
}

private struct TerminalLabView: View {
    @State private var catid = ""
    @State private var businessNumber = ""
    @State private var amount = "1000"
    @State private var pending: NiceLabRequest?
    @State private var preview = ""
    @State private var message = ""
    @State private var showMessage = false
    @State private var installed: Bool?
    @State private var testAccountConfirmed = false
    @State private var confirmRequest = false
    @State private var dispatched = false
    @State private var received = false

    private var vendorTestingEnabled: Bool {
        #if DEBUG && ARTIMENU_VENDOR_TESTING
        true
        #else
        false
        #endif
    }
    private func inform(_ text: String) { message = text; showMessage = true }
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("NICE 연동 개발용 앱입니다. 주문·매출 서버에 연결되어 있지 않으며, 결과를 받아도 결제 완료로 기록하지 않습니다.")
                    Text(vendorTestingEnabled ? "업체 테스트 요청 빌드" : "요청 미리보기 전용 빌드").font(.headline)
                }
                Section("업체에서 받은 테스트 계정") {
                    TextField("NICE CATID", text: $catid).textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("테스트 사업자번호", text: $businessNumber).keyboardType(.numberPad)
                    TextField("테스트 금액(원)", text: $amount).keyboardType(.numberPad)
                }.disabled(dispatched)
                Section("앱 설치 확인") {
                    Button("AppPOS 설치 여부 확인") {
                        installed = UIApplication.shared.canOpenURL(URL(string: "apppos://pay")!)
                        inform(installed == true ? "AppPOS 실행 경로를 확인했습니다. 계정·리더기와 승인 기능은 아직 검증하지 않았습니다." : "AppPOS를 찾지 못했습니다. 업체가 안내한 공식 앱을 설치해 주세요.")
                    }
                }
                Section("요청 미리보기") {
                    Button("개발용 요청 만들기") {
                        do {
                            guard let value = Int(amount) else { throw TerminalLabError.invalidRequest }
                            let request = NiceLabRequest(amount: value, catid: catid.trimmingCharacters(in: .whitespaces), businessNumber: businessNumber.replacingOccurrences(of: "-", with: "").replacingOccurrences(of: " ", with: ""), oid: String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(10)), state: UUID().uuidString)
                            preview = try request.url().absoluteString; pending = request; received = false
                        } catch { inform(error.localizedDescription) }
                    }.disabled(dispatched)
                    if !preview.isEmpty { Text(preview).font(.caption).textSelection(.enabled) }
                }
                Section("업체 테스트 실행") {
                    Toggle("업체에서 테스트 계정과 장비 사용을 승인받았습니다", isOn: $testAccountConfirmed).disabled(dispatched)
                    Button("AppPOS로 테스트 요청") { confirmRequest = true }
                        .disabled(!vendorTestingEnabled || !testAccountConfirmed || installed != true || pending == nil || dispatched)
                    Text("기본 빌드에서는 외부 결제 요청을 실행할 수 없습니다. 업체 계정·장비 조건을 확인한 뒤 개발자가 테스트 빌드에서만 활성화합니다.").font(.footnote)
                    if dispatched { Text(received ? "결과 수신 · 업체 거래 확인 필요" : "요청 전달 · 결과 확인 전 재결제하지 마세요") }
                }
            }
            .navigationTitle("아티메뉴 단말기 테스트")
            .alert("안내", isPresented: $showMessage) { Button("확인", role: .cancel) {} } message: { Text(message) }
            .confirmationDialog("\(pending?.amount ?? 0)원 결제 요청", isPresented: $confirmRequest, titleVisibility: .visible) {
                Button("테스트 요청 보내기") { dispatch() }
                Button("취소", role: .cancel) {}
            } message: { Text("실사용 계정이면 실제 카드 결제가 발생할 수 있습니다. 업체가 승인한 테스트 계정·카드인지 확인하세요.") }
            .onOpenURL { url in
                guard dispatched, !received, let expected = pending else { inform("진행 중인 요청이 없습니다. 업체 거래 조회로 결과를 확인해 주세요."); return }
                do {
                    let result = try NiceLabCallback(url: url, expected: expected)
                    received = true
                    inform("결과 코드 \(result.resultCode)를 수신했습니다. 업체 서버·거래 조회 검증 전이며 주문 결제 상태는 변경하지 않습니다.")
                } catch { inform(error.localizedDescription) }
            }
        }
    }
    private func dispatch() {
        guard vendorTestingEnabled, testAccountConfirmed, installed == true, !dispatched, let request = pending, let url = try? request.url() else { return }
        dispatched = true
        UIApplication.shared.open(url, options: [:]) { opened in
            if !opened { dispatched = false; inform("AppPOS를 열지 못했습니다. 앱과 요청 설정을 확인해 주세요.") }
        }
    }
}
