import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import styles from "./Footer.module.css";

const groups = [
  { title: "서비스", links: [["베이직", "/services/basic"], ["다이닝", "/services/dining"], ["디스플레이", "/services/display"], ["디자인 템플릿", "/templates"]] },
  { title: "이용 안내", links: [["사용가이드", "/guides"], ["고객센터", "/faq"], ["마이 메뉴", "/mypage"]] },
] as const;

function FooterLinkList({ links }: { links: (typeof groups)[number]["links"] }) {
  return (
    <ul>
      {links.map(([label, href]) => (
        <li key={href}><Link href={href}>{label}</Link></li>
      ))}
    </ul>
  );
}

function ContactContent() {
  return (
    <>
      <ul>
        <li><a href="tel:01036460642">010-3646-0642</a></li>
        <li><a href="mailto:admin@dndcommerce.co.kr">admin@dndcommerce.co.kr</a></li>
      </ul>
      <Link href="/mypage/inquiries" className="site-button site-button-outline">1:1 문의하기 <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </>
  );
}

function BusinessDetails() {
  return (
    <dl>
      <div><dt>상호명</dt><dd>디앤디커머스</dd></div>
      <div><dt>대표자</dt><dd>나형미</dd></div>
      <div><dt>개인정보보호책임자</dt><dd>나형미</dd></div>
      <div><dt>사업자등록번호</dt><dd>876-47-00697 <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=8764700697" target="_blank" rel="noopener noreferrer">사업자정보확인 <ArrowUpRight size={13} aria-hidden="true" /></a></dd></div>
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
                <Link href="/" className={styles.brand} aria-label="ArtiMenu 홈">ArtiMenu</Link>
                <p className="type-body text-zinc-600">디지털 혁신과 시각적 스토리텔링을 통해<br />다이닝 경험의 새로운 장면을 만듭니다.</p>
              </div>
              <nav className={`${styles.navigation} ${styles.desktopNavigation}`} aria-label="푸터 메뉴">
                {groups.map(group => <div key={group.title} className={styles.group}>
                  <h2 className="type-label">{group.title}</h2>
                  <FooterLinkList links={group.links} />
                </div>)}
                <div className={`${styles.group} ${styles.contact}`}>
                  <h2 className="type-label">고객지원</h2>
                  <ContactContent />
                </div>
              </nav>
            </div>
            <div className={`${styles.business} ${styles.desktopBusiness}`}>
              <h2 className="type-label sr-only">사업자 정보</h2>
              <BusinessDetails />
            </div>
            <div className={styles.mobileSections} aria-label="푸터 상세 메뉴">
              {groups.map((group) => (
                <details key={group.title} className={styles.disclosure}>
                  <summary><span>{group.title}</span><ChevronDown aria-hidden="true" /></summary>
                  <div className={`${styles.group} ${styles.disclosureContent}`}>
                    <FooterLinkList links={group.links} />
                  </div>
                </details>
              ))}
              <details className={styles.disclosure}>
                <summary><span>고객지원</span><ChevronDown aria-hidden="true" /></summary>
                <div className={`${styles.group} ${styles.contact} ${styles.disclosureContent}`}>
                  <ContactContent />
                </div>
              </details>
              <details className={styles.disclosure}>
                <summary><span>사업자 정보</span><ChevronDown aria-hidden="true" /></summary>
                <div className={`${styles.business} ${styles.disclosureBusiness}`}>
                  <BusinessDetails />
                </div>
              </details>
            </div>
            <div className={styles.bottom}>
              <p className="type-caption uppercase tracking-wide text-zinc-600">© 2026 ArtiMenu Studio.</p>
              <nav className={styles.legal} aria-label="약관 및 정책">
                <Link href="/terms">이용약관</Link>
                <Link href="/privacy">개인정보 처리방침</Link>
                {showAdminLink ? <Link href="/admin">Admin</Link> : null}
              </nav>
            </div>
          </div>
          <div className={styles.wordmark} aria-hidden="true">ArtiMenu</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
