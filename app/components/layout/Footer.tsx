import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "@/app/components/ui/site-arrow";
import { Button } from "@/app/components/ui/button";
import styles from "./Footer.module.css";
import ServiceHomeLink from "@/components/layout/ServiceHomeLink";
import { SERVICE_HOME_HREFS } from "@/lib/service-home-navigation";

const groups = [
  { title: "서비스", links: [["베이직", SERVICE_HOME_HREFS.basic], ["다이닝", SERVICE_HOME_HREFS.dining], ["디스플레이", SERVICE_HOME_HREFS.display], ["디자인 템플릿", "/templates"]] },
  { title: "이용 안내", links: [["자주 묻는 질문", "/faq"], ["공지사항", "/faq/notices"], ["이용가이드", "/guides"], ["마이 메뉴", "/mypage"]] },
] as const;

function FooterLinkList({ links }: { links: readonly (readonly [string, string])[] }) {
  return (
    <ul>
      {links.map(([label, href]) => (
        <li key={href}><ServiceHomeLink href={href}>{label}</ServiceHomeLink></li>
      ))}
    </ul>
  );
}

const mobileGroups = groups.map(group => ({
  ...group,
  links: group.title === "이용 안내" ? [...group.links.filter(([, href]) => href !== "/mypage"), ["1:1 문의", "/mypage/inquiries"] as const] : group.links,
}));

const supportEmail = "admin@dndcommerce.co.kr";
const companySite = "https://www.dndcommerce.co.kr";
const companyName = "디앤디커머스";

function BusinessContactLinks() {
  return (
    <ul className={styles.businessContact} aria-label="연락처">
      <li><a href="tel:01036460642">010-3646-0642</a></li>
      <li><a href={`mailto:${supportEmail}`}>{supportEmail}</a></li>
    </ul>
  );
}

function BusinessDetails({ showName = false }: { showName?: boolean }) {
  return (
    <dl>
      {showName ? <div><dt>상호명</dt><dd>{companyName}</dd></div> : null}
      <div><dt>대표자</dt><dd>나형미</dd></div>
      <div><dt>사업자등록번호</dt><dd>876-47-00697 <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8764700697" target="_blank" rel="noopener noreferrer">사업자정보확인 <ArrowUpRight size={13} aria-hidden="true" /></a></dd></div>
      <div><dt>개인정보보호책임자</dt><dd>나형미</dd></div>
      <div><dt>통신판매업신고번호</dt><dd>2026-경기양평-0670</dd></div>
      <div className={styles.address}><dt>사업장 소재지</dt><dd>경기도 양평군 지평면 수곡로 150-5</dd></div>
    </dl>
  );
}

const Footer = () => {
  const showAdminLink = process.env.NODE_ENV !== "production";

  return (
    <footer id="site-footer" className={styles.footer} aria-label="사이트 정보">
      <div className="site-container">
        <div className={styles.surface}>
          <div className={styles.content}>
            <div className={styles.top}>
              <div className={styles.identity}>
                <Link href="/" className={`type-content-title ${styles.brand}`} aria-label="ArtiMenu 홈">ArtiMenu</Link>
                <h2 className="type-page-title">매장에 맞는 메뉴판을<br />찾고 계신가요?</h2>
                <a className={`type-body ${styles.email}`} href={`mailto:${supportEmail}`}>{supportEmail}<ArrowUpRight size={16} aria-hidden="true" /></a>
              </div>
              <nav className={`${styles.navigation} ${styles.desktopNavigation}`} aria-label="푸터 메뉴">
                {groups.map(group => <div key={group.title} className={styles.group}>
                  <h2 className="type-content-title">{group.title}</h2>
                  <FooterLinkList links={group.links} />
                </div>)}
              </nav>
            </div>
            <section className={styles.desktopBusiness} aria-labelledby="footer-company-title">
              <div className={styles.business}>
                <h2 id="footer-company-title" className="type-content-title">{companyName}</h2>
                <BusinessDetails />
                <BusinessContactLinks />
              </div>
              <div className={styles.businessActions}>
                <Button asChild variant="outline" shape="pill" data-control-surface="dark"><Link href="/mypage/inquiries">1:1 문의하기</Link></Button>
                <Button asChild variant="outline" shape="pill" data-control-surface="dark"><a href={companySite}>회사 사이트 <ArrowUpRight size={16} aria-hidden="true" /></a></Button>
              </div>
            </section>
            <div className={styles.mobileSections} aria-label="푸터 상세 메뉴">
              {mobileGroups.map((group) => (
                <details key={group.title} className={styles.disclosure}>
                  <summary><span className="type-label">{group.title}</span><ChevronDown aria-hidden="true" /></summary>
                  <div className={`${styles.group} ${styles.disclosureContent}`}>
                    <FooterLinkList links={group.links} />
                  </div>
                </details>
              ))}
              <details className={styles.disclosure}>
                <summary><span>사업자 정보</span><ChevronDown aria-hidden="true" /></summary>
                <div className={`${styles.business} ${styles.disclosureBusiness}`}>
                  <BusinessDetails showName />
                  <BusinessContactLinks />
                  <a className={styles.companyLink} href={companySite}>회사 사이트 <ArrowUpRight size={16} aria-hidden="true" /></a>
                </div>
              </details>
            </div>
            <div className={styles.bottom}>
              <nav className={styles.legal} aria-label="약관 및 정책">
                <Link href="/terms">이용약관</Link>
                <Link href="/privacy">개인정보 처리방침</Link>
                {showAdminLink ? <Link href="/admin">Admin</Link> : null}
              </nav>
              <p className={`type-body-sm ${styles.copyright}`}>© 2026 ArtiMenu Studio.</p>
            </div>
          </div>
          <div className={styles.wordmark} aria-hidden="true">ArtiMenu</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
