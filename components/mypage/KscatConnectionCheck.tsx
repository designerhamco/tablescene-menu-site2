"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { LoadingState } from "@/app/components/ui/loading-state";
import { checkKscatFromBrowser, KscatConnectionError } from "@/lib/kscat-connection";
import { kscatLoopbackUrl } from "@/lib/kscat-protocol";

type CheckState = { status: "idle" } | { status: "checking" } | { status: "responding"; versionDate: string } | { status: "error"; message: string };

export default function KscatConnectionCheck({ port }: { port: string }) {
  return <KscatConnectionSession key={port} port={port} />;
}

function KscatConnectionSession({ port }: { port: string }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  async function check() {
    if (active.current) return;
    const controller = new AbortController(); active.current = controller;
    setState({ status: "checking" });
    try {
      kscatLoopbackUrl(port);
      const result = await checkKscatFromBrowser(port, controller.signal);
      if (!controller.signal.aborted) setState({ status: "responding", versionDate: result.versionDate });
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: "error", message: error instanceof KscatConnectionError ? error.message : "KSCAT 프로그램의 WEB 포트를 확인해 주세요." });
    } finally { if (active.current === controller) active.current = null; }
  }

  return <div className="site-stack-block">
    <div className="site-stack-title">
      <h4 className="type-item-title">KSCAT 프로그램 응답 확인</h4>
      <p className="type-body-sm site-copy-muted">KSCAT을 설치한 Windows 기기에서 확인하세요. 프로그램의 버전만 조회하며 카드나 테스트 계정은 필요하지 않습니다. 브라우저가 접근 권한을 물으면 이 기기의 프로그램에 연결하도록 허용해 주세요.</p>
    </div>
    <div className="site-action-row">
      <Button type="button" variant="outline" onClick={check} disabled={!port || state.status === "checking"}>KSCAT 연결 확인</Button>
      {state.status === "checking" ? <Button type="button" variant="ghost" onClick={() => { active.current?.abort(); active.current = null; setState({ status: "idle" }); }}>확인 중단</Button> : null}
    </div>
    {state.status === "checking" ? <LoadingState label="이 기기의 KSCAT 응답을 확인하고 있습니다." inline /> : <div role="status" aria-live="polite" className="site-stack-copy">
      <p className="type-body-sm">{state.status === "responding" ? `KSCAT 프로그램 응답 확인 · 버전 날짜 ${state.versionDate}` : state.status === "error" ? state.message : "아직 확인하지 않았습니다. 위에 KSCAT의 WEB 포트를 입력한 뒤 확인하세요. 기본값은 27098입니다."}</p>
      {state.status === "responding" ? <p className="type-footnote site-copy-muted">프로그램 응답을 확인했습니다. 카드 단말기 연결과 실제 결제 가능 여부는 아직 확인하지 않았습니다.</p> : null}
    </div>}
  </div>;
}
