import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Check, Copy, X } from "@/app/components/ui/site-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";

function WorkExample() {
  return <Tabs purpose="state" defaultValue="active">
    <TabsList size="lg" aria-label="위계 예시 메뉴판 상태">
      <TabsTrigger value="active" count={8}>이용 중</TabsTrigger>
      <TabsTrigger value="holding" count={0}>만료·보관</TabsTrigger>
      <TabsTrigger value="ended" count={13}>종료됨</TabsTrigger>
    </TabsList>
    {(["active", "holding", "ended"] as const).map(value => <TabsContent key={value} value={value}>
      <ContentPanel>
        <div className="site-action-row" data-distribution="between"><h3 className="type-content-title">메뉴판 설정 예시</h3><Button type="button" size="compact" variant="outline"><Copy />복사 예시</Button></div>
        <label className="site-field-stack"><span className="type-label">메뉴판 이름</span><input className="site-field" defaultValue="우리 매장 메뉴판" /></label>
        <div className="site-action-row"><Button type="button"><Check />저장 예시</Button><Button type="button" variant="outline"><X />취소 예시</Button></div>
      </ContentPanel>
    </TabsContent>)}
  </Tabs>;
}

export default function ComponentHierarchyExamples() {
  return <div className="site-management-scope min-w-0" data-component-hierarchy-example>
    <Tabs purpose="page" defaultValue="info">
      <TabsList aria-label="위계 예시 편집 설정">
        <TabsTrigger value="info">기본 정보</TabsTrigger>
        <TabsTrigger value="featured">대표 영역</TabsTrigger>
        <TabsTrigger value="menu">메뉴판 구성</TabsTrigger>
        <TabsTrigger value="design">디자인</TabsTrigger>
      </TabsList>
      {["info", "featured", "menu", "design"].map(value => <TabsContent key={value} value={value}><WorkExample /></TabsContent>)}
    </Tabs>
  </div>;
}
