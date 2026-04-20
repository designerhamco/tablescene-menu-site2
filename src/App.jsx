import { useEffect, useRef, useState } from "react";
import { restaurantData as localRestaurantData } from "./data";
import { defaultLanguage, getLocalizedText, getUiText, supportedLanguages } from "./i18n/uiText";
import { normalizeSheetData, validateSheetData } from "./lib/normalizeSheetData.js";

const pageOrder = ["intro", "about", "menu", "events"];
const languageStorageKey = "tablesceneLanguage";

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

function useDragNavigation(onPrev, onNext) {
  const dragRef = useRef(null);

  function handlePointerDown(event) {
    const interactiveTarget = event.target.closest("button, a");
    if (interactiveTarget) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
      drag.moved = true;
    }
  }

  function handlePointerEnd(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (!drag.moved || Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX < 0) {
      onNext();
    } else {
      onPrev();
    }
  }

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: () => {
      dragRef.current = null;
    },
  };
}

function App() {
  const [restaurantData, setRestaurantData] = useState(localRestaurantData);
  const { settings, intro, about, menu, events } = restaurantData;
  const enabledPages = pageOrder.filter((page) => {
    const pageEnabled = settings.pages[page]?.enabled !== false;
    const dataEnabled = restaurantData[page]?.enabled !== false;
    return pageEnabled && dataEnabled;
  });
  const enabledPagesKey = enabledPages.join(",");
  const fallbackPage = enabledPages[0] ?? "intro";
  const firstPage = enabledPages.includes(settings.defaultPage)
    ? settings.defaultPage
    : fallbackPage;

  const [activePage, setActivePage] = useState(firstPage);
  const [navOpen, setNavOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [language, setLanguage] = useState(() => {
    const savedLanguage = window.localStorage.getItem(languageStorageKey);
    return supportedLanguages.some((item) => item.code === savedLanguage)
      ? savedLanguage
      : defaultLanguage;
  });
  const [menuResetKey, setMenuResetKey] = useState(0);
  const t = (key) => getUiText(language, key);
  const lt = (value) => getLocalizedText(value, language);

  useEffect(() => {
    const sheetUrl = import.meta.env.VITE_SHEET_WEBAPP_URL;
    if (!sheetUrl) return undefined;

    const controller = new AbortController();

    async function loadSheetData() {
      try {
        const separator = sheetUrl.includes("?") ? "&" : "?";
        const response = await fetch(`${sheetUrl}${separator}ts=${Date.now()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Google Sheet request failed: ${response.status}`);
        }

        const sheetData = await response.json();
        const validation = validateSheetData(sheetData);
        if (!validation.isValid) {
          console.warn(
            "Google Sheet 데이터 구조가 비어 있거나 필수 탭이 부족해 로컬 데이터를 유지합니다.",
            validation.missing
          );
          return;
        }

        setRestaurantData(normalizeSheetData(sheetData, localRestaurantData));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn("Google Sheet 데이터를 불러오지 못해 로컬 데이터를 사용합니다.", error);
        }
      }
    }

    loadSheetData();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!enabledPages.includes(activePage)) {
      setActivePage(firstPage);
    }
  }, [activePage, enabledPagesKey, firstPage, enabledPages]);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
  }, [language]);

  function goToPage(page) {
    if (page === "menu") {
      setMenuResetKey((key) => key + 1);
    }
    setActivePage(page);
    setNavOpen(false);
    setLanguageMenuOpen(false);
  }

  function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  }

  const pageProps = {
    intro,
    about,
    menu,
    events,
    settings,
    goToPage,
    enabledPages,
    menuResetKey,
    t,
    lt,
  };

  return (
    <div className="app">
      {activePage !== "intro" && (
        <header className="app-header">
          <button
            className="icon-button hamburger-button"
            type="button"
            aria-label={t("openMenu")}
            onClick={() => setNavOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <strong>{settings.siteTitle}</strong>
          <div className="language-picker">
            <button
              className="icon-button globe-button"
              type="button"
              aria-label={t("languageChange")}
              aria-expanded={languageMenuOpen}
              onClick={() => setLanguageMenuOpen((isOpen) => !isOpen)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M3.5 12h17" />
                <path d="M12 3.5c2.3 2.5 3.4 5.3 3.4 8.5S14.3 18 12 20.5" />
                <path d="M12 3.5C9.7 6 8.6 8.8 8.6 12s1.1 6 3.4 8.5" />
              </svg>
            </button>
            {languageMenuOpen && (
              <div className="language-menu">
                {supportedLanguages.map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    className={language === item.code ? "active" : ""}
                    onClick={() => changeLanguage(item.code)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
      )}

      {navOpen && (
        <Navigation
          pages={enabledPages}
          labels={settings.pages}
          activePage={activePage}
          onClose={() => setNavOpen(false)}
          onMove={goToPage}
          t={t}
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

function Navigation({ pages, activePage, onClose, onMove, t }) {
  return (
    <div className="nav-backdrop">
      <nav className="nav-panel" aria-label={t("navigation")}>
        <div className="nav-top">
          <span>{t("navigation")}</span>
          <button type="button" className="close-button" onClick={onClose}>
            {t("close")}
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
              {t(page)}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function IntroPage({ intro, goToPage, enabledPages, t, lt }) {
  const nextPage = enabledPages.includes("menu") ? "menu" : enabledPages[0];

  return (
    <section
      className="intro-page"
      style={{
        backgroundImage: intro.backgroundImageUrl
          ? `linear-gradient(180deg, rgba(22, 18, 14, 0.28), rgba(22, 18, 14, 0.74)), url(${intro.backgroundImageUrl})`
          : undefined,
      }}
    >
      <div className="intro-content">
        <h1>{lt(intro.storeName)}</h1>
        {lt(intro.headline) && <p className="intro-headline">{lt(intro.headline)}</p>}
        {lt(intro.shortText) && <p className="intro-text">{lt(intro.shortText)}</p>}
        <button type="button" className="primary-button" onClick={() => goToPage(nextPage)}>
          {lt(intro.startButtonText) || t("start")}
        </button>
      </div>
    </section>
  );
}

function AboutPage({ about, settings, t, lt }) {
  const showChefs = settings.sections.about.chefs !== false;
  const showSns = settings.sections.about.sns !== false;
  const showExtra = settings.sections.about.extraInfo !== false;
  const showHeroImage = about.heroImageEnabled === true && Boolean(about.heroImageUrl);
  const chefs = sortByOrder(about.chefs);
  const sns = sortByOrder(about.sns);
  const extraInfo = [
    [t("reservationInfo"), lt(about.reservationHours)],
    [t("parkingInfo"), lt(about.parking)],
    [t("wifi"), lt(about.wifi)],
    [t("corkage"), lt(about.corkage)],
    [t("closedDays"), lt(about.closedDays)],
  ].filter(([, value]) => Boolean(value));

  return (
    <section className="content-page">
      <div className="scroll-content">
        {showHeroImage && (
          <figure className="about-hero-image">
            <img src={about.heroImageUrl} alt={lt(about.heroImageAlt) || `${lt(about.storeName)} ${t("imageAltSuffix")}`} />
          </figure>
        )}
        <h1>{lt(about.storeName)}</h1>
        <p className="lead">{lt(about.description)}</p>

        <div className="info-grid">
          <InfoItem label={t("address")} value={lt(about.address)} />
          <InfoItem label={t("hours")} value={lt(about.hours)} />
          <InfoItem label={lt(about.contact.label)} value={about.contact.value} href={about.contact.link} />
          {about.mapLink && <InfoItem label={t("map")} value={t("openMap")} href={about.mapLink} />}
        </div>

        {showExtra && extraInfo.length > 0 && (
          <section className="section-block">
            <h2>{t("guide")}</h2>
            <div className="info-list">
              {extraInfo.map(([label, value]) => (
                <InfoItem key={label} label={label} value={value} />
              ))}
            </div>
          </section>
        )}

        {showChefs && chefs.length > 0 && (
          <section className="section-block">
            <h2>{t("chefs")}</h2>
            <div className="chef-list">
              {chefs.map((chef) => (
                <article className="chef-card" key={chef.id}>
                  {chef.imageUrl && <img src={chef.imageUrl} alt={`${lt(chef.name)} ${t("chefAltSuffix")}`} />}
                  <div>
                    <p>{lt(chef.title)}</p>
                    <h3>{lt(chef.name)}</h3>
                    <span>{lt(chef.description)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {showSns && sns.length > 0 && (
          <section className="section-block">
            <h2>{t("social")}</h2>
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

function MenuPage({ menu, settings, menuResetKey, t, lt }) {
  const slides = sortByOrder(menu.slides);
  const [index, setIndex] = useState(0);
  const total = slides.length + 1;
  const slide = slides[index - 1];

  useEffect(() => {
    setIndex(0);
  }, [menuResetKey]);

  if (slides.length === 0) {
    return <EmptyPage message={t("noMenu")} />;
  }

  if (index === 0) {
    return (
      <SlidePage
        title=""
        hideTitle
        index={index}
        total={total}
        t={t}
        onPrev={() => setIndex((current) => Math.max(0, current - 1))}
        onNext={() => setIndex((current) => Math.min(total - 1, current + 1))}
      >
        <section className="menu-cover">
          <p className="menu-cover-mark">THE MENU</p>
          <h2>{t("menuCoverTitle")}</h2>
          <p>{t("menuCoverDescription")}</p>
        </section>
      </SlidePage>
    );
  }

  return (
    <SlidePage
      title={lt(slide.title)}
      index={index}
      total={total}
      t={t}
      onPrev={() => setIndex((current) => Math.max(0, current - 1))}
      onNext={() => setIndex((current) => Math.min(total - 1, current + 1))}
    >
      {sortByOrder(slide.categories).map((category) => {
        const items = sortByOrder(category.items);
        const hasImages = items.some(
          (item) => settings.sections.menu.images !== false && item.imageUrl
        );

        return (
          <section className="menu-category" key={category.id}>
            <h2>{lt(category.name)}</h2>
            <div className={`menu-items ${hasImages ? "has-images" : "text-only"}`}>
              {items.map((item) => (
                <MenuItem key={item.id} item={item} settings={settings} t={t} lt={lt} />
              ))}
            </div>
          </section>
        );
      })}
    </SlidePage>
  );
}

function MenuItem({ item, settings, t, lt }) {
  const showImage = settings.sections.menu.images !== false && item.imageUrl;
  const showLabel = settings.sections.menu.labels !== false && item.useLabel && lt(item.labelName);
  const showOrigin = settings.sections.menu.origin !== false && lt(item.origin);

  return (
    <article
      className={`menu-item ${showImage ? "has-image" : ""} ${item.isSoldOut ? "sold-out" : ""}`}
    >
      {showImage && <img src={item.imageUrl} alt={lt(item.name)} />}
      <div className="menu-item-body">
        <div className="menu-item-top">
          <div>
            <h3>{lt(item.name)}</h3>
            <div className="menu-badges">
              {item.isRecommended && <span className="badge recommend">{t("recommended")}</span>}
              {showLabel && <span className="badge">{lt(item.labelName)}</span>}
              {item.isSoldOut && <span className="badge muted">{t("soldOut")}</span>}
            </div>
          </div>
          <strong>{formatPrice(item.price)}</strong>
        </div>
        {lt(item.description) && <p>{lt(item.description)}</p>}
        {showOrigin && <small>{lt(item.origin)}</small>}
      </div>
    </article>
  );
}

function EventsPage({ events, settings, t, lt }) {
  const slides = sortByOrder(events.slides).filter((slide) => slide.visible !== false);
  const [index, setIndex] = useState(0);
  const event = slides[index];

  if (!event) {
    return <EmptyPage message={t("noEvent")} />;
  }

  const showImage = settings.sections.events.images !== false && event.imageUrl;
  const goPrev = () => setIndex((current) => Math.max(0, current - 1));
  const goNext = () => setIndex((current) => Math.min(slides.length - 1, current + 1));
  const dragHandlers = useDragNavigation(goPrev, goNext);

  return (
    <section className="content-page">
      <div className="scroll-content event-scroll-content draggable-page" {...dragHandlers}>
        <article className={`event-card ${showImage ? "" : "no-image"}`}>
          {showImage && <img src={event.imageUrl} alt={lt(event.title)} />}
          <div className="event-body">
            <h2 className="event-title">{lt(event.title)}</h2>
            {lt(event.subtitle) && !lt(event.subtitle).includes(":") && (
              <p className="event-subtitle">{lt(event.subtitle)}</p>
            )}
            {lt(event.description) && <p className="lead">{lt(event.description)}</p>}
            <div className="info-list">
              <InfoItem label={t("period")} value={lt(event.period)} />
              <InfoItem label={t("price")} value={lt(event.price)} />
              <InfoItem label={t("benefit")} value={lt(event.benefitDetails)} />
            </div>
          </div>
        </article>
        <div className="inline-slide-controls">
          <button type="button" onClick={goPrev} disabled={index === 0} aria-label={t("prev")}>
            {t("prev")}
          </button>
          <div className="dots" aria-hidden="true">
            {Array.from({ length: slides.length }).map((_, dotIndex) => (
              <span key={dotIndex} className={dotIndex === index ? "active" : ""} />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={index === slides.length - 1}
            aria-label={t("next")}
          >
            {t("next")}
          </button>
        </div>
      </div>
    </section>
  );
}

function SlidePage({ title, hideTitle = false, index, total, onPrev, onNext, children, t }) {
  const dragHandlers = useDragNavigation(onPrev, onNext);

  return (
    <section className="content-page slide-page draggable-page" {...dragHandlers}>
      <div className="slide-head">
        <div>{!hideTitle && <h1>{title}</h1>}</div>
      </div>
      <div className="scroll-content slide-content">{children}</div>
      <div className="slide-controls">
        <button type="button" onClick={onPrev} disabled={index === 0} aria-label={t("prev")}>
          {t("prev")}
        </button>
        <div className="dots" aria-hidden="true">
          {Array.from({ length: total }).map((_, dotIndex) => (
            <span key={dotIndex} className={dotIndex === index ? "active" : ""} />
          ))}
        </div>
        <button type="button" onClick={onNext} disabled={index === total - 1} aria-label={t("next")}>
          {t("next")}
        </button>
      </div>
    </section>
  );
}

function EmptyPage({ message }) {
  return (
    <section className="content-page">
      <div className="scroll-content">
        <h1>{message}</h1>
      </div>
    </section>
  );
}

export default App;
