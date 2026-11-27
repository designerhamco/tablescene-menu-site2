"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { RoomTabs } from "@/app/components/ui/room-tabs";
import { Plus } from "@/app/components/ui/site-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import HintBubble from "@/components/ui/HintBubble";
import styles from "./SiteComponentGallery.module.css";

const exampleRooms = [
  { id: "room1", name: "룸 1" },
  { id: "room2", name: "룸 2" },
];

export default function ShapedTabExamples() {
  const [roomId, setRoomId] = useState(exampleRooms[0].id);
  const room = exampleRooms.find(item => item.id === roomId) ?? exampleRooms[0];
  return <section className={styles.section} id="shaped-tabs" aria-labelledby="shaped-tabs-title">
    <h2 className="type-section-title" id="shaped-tabs-title">화면·작업 영역·목록 전환 예시</h2>
    <div className="site-stack-block">
      <div className={styles.heading}><h3 className="type-content-title">주문 관리 · 밑줄 탭</h3><p className="type-body-sm site-copy-muted">화면을 바꾸는 탭에는 글자 너비의 3px 선택선을 씁니다.</p></div>
      <Tabs purpose="page" defaultValue="current">
        <TabsList aria-label="주문 관리 화면 전환 예시">
          <TabsTrigger value="current">현재 주문</TabsTrigger>
          <TabsTrigger value="history">주문 이력</TabsTrigger>
          <TabsTrigger value="settings">주문 설정</TabsTrigger>
        </TabsList>
        <TabsContent value="current" className="type-body-sm">접수한 주문과 진행 상태를 확인합니다.</TabsContent>
        <TabsContent value="history" className="type-body-sm">처리된 주문을 기간별로 확인합니다.</TabsContent>
        <TabsContent value="settings" className="type-body-sm">주문 접수와 알림을 설정합니다.</TabsContent>
      </Tabs>
    </div>
    <div className="site-stack-block">
      <div className={styles.heading}><h3 className="type-content-title">룸 관리 · 콘텐츠 연결형 탭</h3><p className="type-body-sm site-copy-muted">선택한 룸의 흰 바탕이 아래 작업 영역과 이어집니다.</p></div>
      <RoomTabs label="문서형 룸 탭 예시" rooms={exampleRooms} value={room.id} onValueChange={setRoomId}
        action={<Button variant="outline" shape="rounded" size="icon" iconAppearance="framed" disabled aria-label="룸 추가"><Plus aria-hidden="true" /></Button>}>
        <ContentPanel data-room-tabs-surface><p className="type-body-sm">{room.name}의 배치를 편집하는 영역입니다.</p></ContentPanel>
      </RoomTabs>
    </div>
    <div className="site-stack-block">
      <div className={styles.heading}><h3 className="type-content-title">내 메뉴판 · 상태 필터</h3><p className="type-body-sm site-copy-muted">같은 메뉴판 목록의 조회 범위를 바꿉니다. 현재 값은 검정 채움으로 표시하고 건수는 보조 크기로 둡니다.</p></div>
      <Tabs purpose="state" defaultValue="active">
        <TabsList size="lg" aria-label="상태값 변경 예시">
          <TabsTrigger value="active" count={8}>이용 중</TabsTrigger>
          <TabsTrigger value="holding" count={0}>만료·보관</TabsTrigger>
          <TabsTrigger value="ended" count={13}>종료됨</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="type-body-sm">이용 중인 메뉴판</TabsContent>
        <TabsContent value="holding" className="type-body-sm">보관 중인 메뉴판</TabsContent>
        <TabsContent value="ended" className="type-body-sm">종료된 메뉴판</TabsContent>
      </Tabs>
    </div>
    <div><HintBubble>완성된 디자인으로 시작</HintBubble><p className="type-body-sm mt-4 text-zinc-600">상시 안내는 공통 말풍선의 한 줄형을 사용합니다. 같은 둥근 모서리·꼬리·그림자를 공유하며, 조작 없이 계속 보이고 설명할 버튼과 연결합니다.</p></div>
  </section>;
}
