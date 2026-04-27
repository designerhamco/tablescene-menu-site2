import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShoppingCart, Menu, X, ArrowRight,
  LayoutGrid, Crown, Zap, Palette, Camera, Package,
  BarChart, Globe, Shield, Smartphone, ChevronRight, Bell, ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router';
import AuthNav from '../auth/AuthNav';
const logoImage = '/assets/tablescene-symbol.png';

const NAV_DATA = {
  services: {
    title: "웹 메뉴판",
    id: "services",
    label: "솔루션",
    items: [
      { 
        label: "테이블씬 PRO AI", 
        path: "#", 
        desc: "데이터 기반으로 매출을 극대화하는 AI 파트너", 
        icon: LayoutGrid,
        badge: "AI"
      },
      { 
        label: "테이블씬 PRO 1.0", 
        path: "/services/pro-v1", 
        desc: "주문, 결제, 호출을 하나로 담은 올인원 솔루션", 
        icon: LayoutGrid,
        badge: "할인" 
      },
      { 
        label: "테이블씬 DINING", 
        path: "/services/signature", 
        desc: "웹 메뉴판과 프리미엄 QR 웰컴카드의 완벽한 조화", 
        icon: Crown,
        badge: "할인" 
      },
      { 
        label: "디자인 커스터마이징", 
        path: "/services/design-customizing", 
        desc: "브랜드 아이덴티티를 담은 독창적인 UX/UI", 
        icon: Palette 
      }
    ],
    notice: {
      label: "소식 · 공지사항",
      path: "#",
      icon: Bell
    },
    promo: {
      label: "새로운 소식",
      title: "Table Scene 2.0\n런칭 기념 혜택",
      subtitle: "지금 가입하고 50% 할인 받으세요",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&q=80&w=800",
      link: "#"
    }
  },
  branding: {
    title: "푸드 비주얼 & 브랜딩",
    id: "branding",
    label: "브랜딩 솔루션",
    items: [
      { 
        label: "푸드비주얼 아트", 
        path: "/branding/food-visual-art", 
        desc: "고객의 시선을 사로잡는 시즐감 넘치는 촬영", 
        icon: Camera,
        badge: "추천"
      },
      { 
        label: "굿즈 & 패키지", 
        path: "#", 
        desc: "브랜드 경험을 확장하는 굿즈와 패키지 디자인", 
        icon: Package 
      }
    ],
    promo: {
      label: "포트폴리오",
      title: "성공적인 브랜딩\n사례 모음집",
      subtitle: "매출이 오르는 디자인의 비밀",
      image: "https://images.unsplash.com/photo-1542038784424-fa00ed4998dc?auto=format&fit=crop&q=80&w=800",
      link: "#"
    }
  },
  store: {
    title: "스토어",
    id: "store",
    path: "/store"
  }
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [activeMobileSection, setActiveMobileSection] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  const updateActiveDropdown = useCallback((nextDropdown: string | null) => {
    setActiveDropdown((currentDropdown) => (currentDropdown === nextDropdown ? currentDropdown : nextDropdown));
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsOpen((currentIsOpen) => (currentIsOpen ? false : currentIsOpen));
  }, []);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen((currentIsOpen) => (currentIsOpen ? false : currentIsOpen));
    setActiveDropdown((currentDropdown) => (currentDropdown === null ? currentDropdown : null));
    setActiveMobileSection((currentSection) => (currentSection === null ? currentSection : null));
  }, [pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 50;
      setIsScrolled((currentIsScrolled) =>
        currentIsScrolled === nextIsScrolled ? currentIsScrolled : nextIsScrolled,
      );
    };
    
    // Check initial position
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dynamic Styles
  const isLightPage = ['/services/simple-template', '/services/pro-v1', '/services/design-customizing'].includes(pathname);
  const shouldShowDarkNav = isScrolled || activeDropdown || isLightPage || isOpen;

  const navBgClass = shouldShowDarkNav
    ? "bg-white/90 backdrop-blur-md border-b border-zinc-100" 
    : "bg-transparent border-transparent";
    
  const logoTextClass = shouldShowDarkNav ? "text-black" : "text-white";
  const navTextClass = shouldShowDarkNav
    ? "text-zinc-600 hover:text-black" 
    : "text-white/90 hover:text-white";
  const iconClass = shouldShowDarkNav ? "text-black hover:text-zinc-600" : "text-white hover:text-white/80";
  const menuButtonClass = shouldShowDarkNav ? "text-black" : "text-white";
  const navContainerClass = activeDropdown ? "bg-white border-b border-zinc-100" : navBgClass;

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-20 ${navContainerClass}`}
        onMouseLeave={() => updateActiveDropdown(null)}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between relative">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0 z-50">
            {/* Logo Icon with Yellow Background */}
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] md:rounded-xl bg-[#F8E731] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300">
                <img 
                    src={logoImage} 
                    alt="TableScene Symbol" 
                    className="w-5 h-5 md:w-6 md:h-6 object-contain rotate-45" 
                />
            </div>

            {/* Logo Text */}
            <div className="flex flex-col items-start leading-none">
                <span className={`text-xl md:text-2xl tracking-tighter font-bold transition-colors duration-300 ${logoTextClass}`}>
                TABLE SCENE
                </span>
                <span className={`text-[9px] md:text-[10px] tracking-[0.3em] font-sans font-medium mt-0.5 ml-0.5 opacity-60 uppercase transition-colors duration-300 ${logoTextClass}`}>
                Studio
                </span>
            </div>
          </Link>

          {/* Desktop Nav - Centered */}
          <div className="hidden lg:flex items-center gap-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full">
            {Object.values(NAV_DATA).map((item) => (
              <div 
                key={item.id}
                className="h-full flex items-center"
                onMouseEnter={() => {
                  if ('items' in item) {
                    updateActiveDropdown(item.id);
                  } else {
                    updateActiveDropdown(null);
                  }
                }}
              >
                <Link 
                  to={item.path || '#'}
                  className={`text-[15px] font-bold tracking-tight transition-colors duration-200 py-2 ${navTextClass} ${activeDropdown === item.id ? 'text-black' : ''}`}
                >
                  {item.title}
                </Link>
              </div>
            ))}
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-6 shrink-0 z-50">
            <AuthNav dark={shouldShowDarkNav} />

            <button className={`transition-colors p-1 ${iconClass}`}>
              <ShoppingCart size={20} strokeWidth={2} />
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
              className={`lg:hidden p-1 transition-colors ${menuButtonClass}`}
              onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>

        {/* Mega Menu Dropdown - Moved outside the centered container to span full width */}
        <AnimatePresence>
          {activeDropdown && NAV_DATA[activeDropdown as keyof typeof NAV_DATA] && 'items' in NAV_DATA[activeDropdown as keyof typeof NAV_DATA] && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 bg-white border-b border-zinc-100 shadow-xl overflow-hidden"
              style={{ height: 'auto' }}
            >
              <div className="max-w-7xl mx-auto px-6 py-8">
                  {/* @ts-ignore */}
                  {(() => {
                    const data = NAV_DATA[activeDropdown as keyof typeof NAV_DATA];
                    // @ts-ignore
                    if (!data.items) return null;

                    return (
                      <div className="grid grid-cols-12 gap-12">
                        {/* Column 1: Solutions (Main Items) */}
                        {/* @ts-ignore */}
                        <div className={data.platform ? "col-span-6" : "col-span-8"}>
                          {/* @ts-ignore */}
                          <div className={`grid gap-x-8 gap-y-8 ${data.platform ? "grid-cols-1" : "grid-cols-2"}`}>
                            {/* @ts-ignore */}
                            {data.items.map((subItem, idx) => {
                              const isDisabled = subItem.path === "#";
                              
                              return (
                                <Link 
                                  key={idx} 
                                  to={subItem.path}
                                  className={`group flex items-start gap-5 p-2 -ml-2 rounded-xl transition-colors ${
                                    isDisabled 
                                      ? "opacity-50 cursor-not-allowed" 
                                      : "hover:bg-zinc-50"
                                  }`}
                                  onClick={(e) => {
                                    if (isDisabled) {
                                      e.preventDefault();
                                      alert("서비스 준비중입니다.");
                                      return;
                                    }
                                    updateActiveDropdown(null);
                                  }}
                                >
                                  <div className={`w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 transition-all duration-300 shrink-0 ${
                                    !isDisabled && "group-hover:bg-black group-hover:text-white"
                                  }`}>
                                    {subItem.icon && <subItem.icon size={24} strokeWidth={1.5} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className={`text-lg font-bold text-zinc-900 transition-colors ${
                                        !isDisabled && "group-hover:text-black"
                                      }`}>
                                        {subItem.label}
                                      </h4>
                                      {subItem.badge && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${['AI', '추천'].includes(subItem.badge) ? 'bg-[#F8E731] text-black' : 'bg-black text-white'}`}>
                                          {subItem.badge}
                                        </span>
                                      )}
                                      {isDisabled && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-500">
                                          준비중
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-sm text-zinc-500 font-medium transition-colors ${
                                      !isDisabled && "group-hover:text-zinc-700"
                                    }`}>
                                      {subItem.desc}
                                    </p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>

                          {/* @ts-ignore */}
                          {data.notice && (
                            <div className="mt-6 flex justify-end border-t border-zinc-100 pt-4">
                              <Link 
                                to={data.notice.path} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-50 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                                onClick={() => {
                                  alert("서비스 업데이트 소식 준비중입니다.");
                                  updateActiveDropdown(null);
                                }}
                              >
                                <data.notice.icon size={12} />
                                {data.notice.label}
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Platform/Services List */}
                        {/* @ts-ignore */}
                        {data.platform && (
                          <div className="col-span-3 border-l border-zinc-100 pl-12">
                            {/* @ts-ignore */}
                            <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase mb-8">{data.platform.label}</div>
                            <ul className="space-y-4">
                              {/* @ts-ignore */}
                              {data.platform.items.map((item, idx) => (
                                <li key={idx}>
                                  <Link 
                                    to={item.href}
                                    className="text-zinc-600 hover:text-black font-medium transition-colors flex items-center gap-2 group"
                                  >
                                    {item.label}
                                    {/* <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" /> */}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Column 3: Promo Card */}
                        {/* @ts-ignore */}
                        <div className={data.platform ? "col-span-3" : "col-span-4 border-l border-zinc-100 pl-12"}>
                          {/* @ts-ignore */}
                          <Link to={data.promo?.link} className="block group relative rounded-2xl overflow-hidden aspect-[4/5] bg-zinc-100">
                            {/* @ts-ignore */}
                            <img 
                              src={data.promo?.image} 
                              alt="Promo" 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-6">
                              <div className="flex items-center gap-2 text-white text-xs font-bold mb-2 uppercase tracking-wider">
                                <span>이벤트</span>
                                <ArrowRight size={14} />
                              </div>
                              {/* @ts-ignore */}
                              <h4 className="text-2xl font-bold text-white leading-tight mb-2 whitespace-pre-line">
                                {data.promo?.title}
                              </h4>
                              {/* @ts-ignore */}
                              <p className="text-white/80 text-sm font-medium">
                                {data.promo?.subtitle}
                              </p>
                            </div>
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-20 z-40 bg-white"
          >
            <div className="h-full flex flex-col overflow-y-auto pb-10">
              <div className="flex-1 px-6 py-6">
                {Object.values(NAV_DATA).map((item) => {
                  const hasSubItems = 'items' in item;
                  const isExpanded = activeMobileSection === item.id;
                  
                  return (
                    <div key={item.id} className="border-b border-zinc-100 last:border-0">
                      <div 
                        className="py-6 flex items-center justify-between cursor-pointer group"
                        onClick={() => {
                          if (hasSubItems) {
                            setActiveMobileSection((currentSection) => (currentSection === item.id ? null : item.id));
                          } else {
                            // Direct link navigation logic here if needed, 
                            // currently 'store' has a path but the Link is wrapped or separate?
                            // For consistency, we use Link if no subitems, or div if subitems.
                          }
                        }}
                      >
                         {hasSubItems ? (
                           <div className="flex items-center justify-between w-full">
                              <span className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${isExpanded ? 'text-black' : 'text-zinc-400'}`}>
                                {item.title}
                              </span>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <ChevronDown size={24} className={isExpanded ? 'text-black' : 'text-zinc-400'} />
                              </motion.div>
                           </div>
                         ) : (
                           <Link 
                             to={item.path || '#'}
                             className="text-3xl font-bold text-zinc-400 hover:text-black tracking-tight block w-full transition-colors duration-300"
                             onClick={closeMobileMenu}
                           >
                             {item.title}
                           </Link>
                         )}
                      </div>

                      <AnimatePresence>
                        {isExpanded && hasSubItems && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="pb-8 space-y-8">
                               {/* Sub Items List */}
                               <div className="grid gap-6">
                                  {/* @ts-ignore */}
                                  {item.items.map((subItem, idx) => {
                                    const isDisabled = subItem.path === "#";
                                    return (
                                      <Link
                                        key={idx}
                                        to={subItem.path}
                                        className={`flex items-start gap-4 group ${isDisabled ? "opacity-50" : ""}`}
                                        onClick={(e) => {
                                          if (isDisabled) {
                                            e.preventDefault();
                                            alert("서비스 준비중입니다.");
                                            return;
                                          }
                                          closeMobileMenu();
                                        }}
                                      >
                                         <div className="w-11 h-11 rounded-2xl bg-zinc-50 flex items-center justify-center shrink-0 text-zinc-900 group-active:scale-95 transition-all">
                                            {subItem.icon && <subItem.icon size={22} strokeWidth={1.5} />}
                                         </div>
                                         <div className="pt-0.5">
                                            <div className="flex items-center gap-2">
                                              <span className="text-base font-bold text-zinc-900">{subItem.label}</span>
                                              {subItem.badge && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${['AI', '추천'].includes(subItem.badge) ? 'bg-[#F8E731] text-black' : 'bg-black text-white'}`}>
                                                  {subItem.badge}
                                                </span>
                                              )}
                                              {isDisabled && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-500">
                                                  준비중
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1 font-medium">{subItem.desc}</p>
                                         </div>
                                      </Link>
                                    );
                                  })}
                               </div>

                               {/* Promo Card (Mobile) */}
                               {/* @ts-ignore */}
                               {item.promo && (
                                 <Link 
                                  to={item.promo.link}
                                  className="block relative rounded-xl overflow-hidden aspect-[16/9] w-full"
                                  onClick={closeMobileMenu}
                                 >
                                    <img 
                                      /* @ts-ignore */
                                      src={item.promo.image} 
                                      alt="Promo" 
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white mb-1 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/20">
                                        추천
                                        <ArrowRight size={10} />
                                      </span>
                                      {/* @ts-ignore */}
                                      <h4 className="text-lg font-bold text-white leading-tight mt-1">{item.promo.title}</h4>
                                      {/* @ts-ignore */}
                                      <p className="text-xs text-white/80 mt-1 line-clamp-1">{item.promo.subtitle}</p>
                                    </div>
                                 </Link>
                               )}

                               {/* Notice Link */}
                               {/* @ts-ignore */}
                               {item.notice && (
                                  <div className="pt-2">
                                    <button
                                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-zinc-300 text-zinc-500 text-sm font-medium hover:bg-zinc-50 hover:text-black transition-colors"
                                      onClick={() => {
                                        alert("서비스 업데이트 소식 준비중입니다.");
                                        closeMobileMenu();
                                      }}
                                    >
                                      {/* @ts-ignore */}
                                      <item.notice.icon size={14} />
                                      {/* @ts-ignore */}
                                      {item.notice.label}
                                    </button>
                                  </div>
                               )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              
              {/* Footer info in menu - Minimal & Clean */}
              <div className="px-6 py-8 mt-auto">
                 <div className="pt-6 border-t border-zinc-100">
                    <div className="flex flex-col gap-0.5 text-[10px] text-zinc-400 font-medium tracking-tight">
                       <p className="text-zinc-900 font-bold text-xs mb-1">TABLE SCENE Studio</p>
                       <p>admin@dndcommerce.co.kr</p>
                       <p className="mt-1 opacity-60">© 2026 Table Scene. All rights reserved.</p>
                    </div>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
