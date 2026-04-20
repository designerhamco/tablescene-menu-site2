import { useMemo, useState } from "react";
import { restaurantData } from "./data";

const pageOrder = ["intro", "about", "menu", "events"];

function sortByOrder(items = []) {
  return [...items]
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function formatPrice(price) {
  if (price === "" || price === undefined || price === null) return "";
  if (typeof price === "number") return `${price.toLocaleString("ko-KR")}원`;
  return price;
}

function App() {
  const { settings, intro, about, menu, events } = restaurantData;
  const enabledPages = pageOrder.filter((page) => {
    const pageEnabled = settings.pages[page]?.enabled !== false;
    const dataEnabled = restaurantData[page]?.enabled !== false;
    return pageEnabled && dataEnabled;
  });
  const fallbackPage = enabledPages[0] ?? "intro";
  const firstPage = enabledPages.includes(settings.defaultPage)
    ? settings.defaultPage
    : fallbackPage;

  const [activePage, setActivePage] = useState(firstPage);
  const [navOpen, setNavOpen] = useState(false);

  function goToPage(page) {
    setActivePage(page);
    setNavOpen(false);
  }

  const pageProps = {
    intro,
    about,
    menu,
    events,
    settings,
    goToPage,
    enabledPages,
  };

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="icon-button"
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setNavOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
        <strong>{settings.siteTitle}</strong>
      </header>

      {navOpen && (
        <Navigation
          pages={enabledPages}
          labels={settings.pages}
          activePage={activePage}
          onClose={() => setNavOpen(false)}
          onMove={goToPage}
        />
      )}

      <main className="page-frame">
        {activePage === "intro" && <IntroPage {...pageProps} />}
        {activePage === "about" && <AboutPage {...pageProps} />}
        {activePage === "menu" && <MenuPage {...pageProps} />}
        {activePage === "events" && <EventsPage {...pageProps} />}
      </main>
    </div>
  );
}

function Navigation({ pages, labels, activePage, onClose, onMove }) {
  return (
    <div className="nav-backdrop">
      <nav className="nav-panel" aria-label="페이지 이동">
        <div className="nav-top">
          <span>MENU</span>
          <button type="button" className="close-button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="nav-links">
          {pages.map((page) => (
            <button
              type="button"
              key={page}
              className={activePage === page ? "active" : ""}
              onClick={() => onMove(page)}
            >
              {labels[page]?.label ?? page}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function IntroPage({ intro, goToPage, enabledPages }) {
  const nextPage = enabledPages.includes("about")
    ? "about"
    : enabledPages.includes("menu")
      ? "menu"
      : enabledPages[0];

  return (
    <section
      className="intro-page"
      style={{
        backgroundImage: intro.backgroundImage
          ? `linear-gradient(180deg, rgba(22, 18, 14, 0.28), rgba(22, 18, 14, 0.74)), url(${intro.backgroundImage})`
          : undefined,
      }}
    >
      <div className="intro-content">
        <p className="eyebrow">WEB MENU</p>
        <h1>{intro.storeName}</h1>
        {intro.headline && <p className="intro-headline">{intro.headline}</p>}
        {intro.shortText && <p className="intro-text">{intro.shortText}</p>}
        <button type="button" className="primary-button" onClick={() => goToPage(nextPage)}>
          {intro.startButtonText || "시작하기"}
        </button>
      </div>
    </section>
  );
}

function AboutPage({ about, settings }) {
  const showChefs = settings.sections.about.chefs !== false;
  const showSns = settings.sections.about.sns !== false;
  const showExtra = settings.sections.about.extraInfo !== false;
  const chefs = sortByOrder(about.chefs);
  const sns = sortByOrder(about.sns);
  const extraInfo = [
    ["예약 가능 시간", about.reservationHours],
    ["주차", about.parking],
    ["와이파이", about.wifi],
    ["콜키지", about.corkage],
    ["휴무일", about.closedDays],
  ].filter(([, value]) => Boolean(value));

  return (
    <section className="content-page">
      <div className="scroll-content">
        <p className="eyebrow">ABOUT</p>
        <h1>{about.storeName}</h1>
        <p className="lead">{about.description}</p>

        <div className="info-grid">
          <InfoItem label="주소" value={about.address} />
          <InfoItem label="운영시간" value={about.hours} />
          <InfoItem label={about.contact.label} value={about.contact.value} href={about.contact.link} />
          {about.mapLink && <InfoItem label="지도" value="지도 열기" href={about.mapLink} />}
        </div>

        {showExtra && extraInfo.length > 0 && (
          <section className="section-block">
            <h2>이용 안내</h2>
            <div className="info-list">
              {extraInfo.map(([label, value]) => (
                <InfoItem key={label} label={label} value={value} />
              ))}
            </div>
          </section>
        )}

        {showChefs && chefs.length > 0 && (
          <section className="section-block">
            <h2>Chef</h2>
            <div className="chef-list">
              {chefs.map((chef) => (
                <article className="chef-card" key={chef.id}>
                  {chef.image && <img src={chef.image} alt={`${chef.name} 셰프`} />}
                  <div>
                    <p>{chef.title}</p>
                    <h3>{chef.name}</h3>
                    <span>{chef.description}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {showSns && sns.length > 0 && (
          <section className="section-block">
            <h2>SNS</h2>
            <div className="sns-list">
              {sns.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function InfoItem({ label, value, href }) {
  if (!value) return null;
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
    </>
  );

  if (href) {
    return (
      <a className="info-item" href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
        {content}
      </a>
    );
  }

  return <div className="info-item">{content}</div>;
}

function MenuPage({ menu, settings }) {
  const slides = useMemo(() => sortByOrder(menu.slides), [menu.slides]);
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  if (!slide) {
    return <EmptyPage title="Menu" message="표시할 메뉴가 없습니다." />;
  }

  return (
    <SlidePage
      eyebrow="MENU"
      title={slide.title}
      index={index}
      total={slides.length}
      onPrev={() => setIndex((current) => Math.max(0, current - 1))}
      onNext={() => setIndex((current) => Math.min(slides.length - 1, current + 1))}
    >
      {sortByOrder(slide.categories).map((category) => (
        <section className="menu-category" key={category.id}>
          <h2>{category.name}</h2>
          <div className="menu-items">
            {sortByOrder(category.items).map((item) => (
              <MenuItem key={item.id} item={item} settings={settings} />
            ))}
          </div>
        </section>
      ))}
    </SlidePage>
  );
}

function MenuItem({ item, settings }) {
  const showImage = settings.sections.menu.images !== false && item.image;
  const showLabel = settings.sections.menu.labels !== false && item.useLabel && item.labelName;
  const showOrigin = settings.sections.menu.origin !== false && item.origin;

  return (
    <article className={`menu-item ${item.isSoldOut ? "sold-out" : ""}`}>
      {showImage && <img src={item.image} alt={item.name} />}
      <div className="menu-item-body">
        <div className="menu-item-top">
          <div>
            <h3>{item.name}</h3>
            <div className="menu-badges">
              {item.isRecommended && <span className="badge recommend">추천</span>}
              {showLabel && <span className="badge">{item.labelName}</span>}
              {item.isSoldOut && <span className="badge muted">Sold out</span>}
            </div>
          </div>
          <strong>{formatPrice(item.price)}</strong>
        </div>
        {item.description && <p>{item.description}</p>}
        {showOrigin && <small>{item.origin}</small>}
      </div>
    </article>
  );
}

function EventsPage({ events, settings }) {
  const slides = useMemo(
    () => sortByOrder(events.slides).filter((slide) => slide.visible !== false),
    [events.slides]
  );
  const [index, setIndex] = useState(0);
  const event = slides[index];

  if (!event) {
    return <EmptyPage title="Events" message="표시할 이벤트가 없습니다." />;
  }

  return (
    <SlidePage
      eyebrow="EVENTS"
      title={event.title}
      index={index}
      total={slides.length}
      onPrev={() => setIndex((current) => Math.max(0, current - 1))}
      onNext={() => setIndex((current) => Math.min(slides.length - 1, current + 1))}
    >
      <article className="event-card">
        {settings.sections.events.images !== false && event.image && (
          <img src={event.image} alt={event.title} />
        )}
        <div className="event-body">
          {event.subtitle && <p className="event-subtitle">{event.subtitle}</p>}
          <p className="lead">{event.description}</p>
          {settings.sections.events.details !== false && (
            <div className="info-list">
              <InfoItem label="기간" value={event.period} />
              <InfoItem label="가격" value={event.price} />
              <InfoItem label="혜택" value={event.benefitDetails} />
            </div>
          )}
        </div>
      </article>
    </SlidePage>
  );
}

function SlidePage({ eyebrow, title, index, total, onPrev, onNext, children }) {
  return (
    <section className="content-page slide-page">
      <div className="slide-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <span>
          {index + 1} / {total}
        </span>
      </div>
      <div className="scroll-content slide-content">{children}</div>
      <div className="slide-controls">
        <button type="button" onClick={onPrev} disabled={index === 0} aria-label="이전 슬라이드">
          이전
        </button>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: total }).map((_, dotIndex) => (
            <span key={dotIndex} className={dotIndex === index ? "active" : ""} />
          ))}
        </div>
        <button type="button" onClick={onNext} disabled={index === total - 1} aria-label="다음 슬라이드">
          다음
        </button>
      </div>
    </section>
  );
}

function EmptyPage({ title, message }) {
  return (
    <section className="content-page">
      <div className="scroll-content">
        <p className="eyebrow">{title}</p>
        <h1>{message}</h1>
      </div>
    </section>
  );
}

export default App;
