import React from 'react';
import { motion } from 'motion/react';

const devices = [
  {
    title: '대형 스크린',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=1200&auto=format&fit=crop',
    className: 'col-span-2 md:col-span-4 md:row-span-2',
  },
  {
    title: 'TV / 모니터',
    image: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?q=80&w=1200&auto=format&fit=crop',
    className: 'md:col-span-5',
  },
  {
    title: '태블릿',
    image: 'https://images.unsplash.com/photo-1489925461942-d8f490a04588?q=80&w=1200&auto=format&fit=crop',
    className: 'md:col-span-3',
  },
  {
    title: '노트북',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1200&auto=format&fit=crop',
    className: 'md:col-span-5',
  },
  {
    title: '모바일 QR',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1200&auto=format&fit=crop',
    className: 'md:col-span-3 md:mr-8 lg:mr-14',
  },
];

type DeviceSelectionProps = {
  muted?: boolean;
  includeLargeScreen?: boolean;
  title?: React.ReactNode;
};

const DeviceSelection = ({
  muted = true,
  includeLargeScreen = true,
  title = <>메뉴판 하나로,<br className="hidden md:block" />모든 디바이스에서 열어보세요</>,
}: DeviceSelectionProps) => {
  const visibleDevices = includeLargeScreen
    ? devices
    : devices.filter((device) => device.title !== '대형 스크린');

  return (
    <section className={`relative py-14 md:min-h-screen md:py-16 ${muted ? 'bg-zinc-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl">
              {title}
            </h2>

          </motion.div>
        </div>

        <div className={`mx-auto grid max-w-6xl grid-cols-2 gap-3 md:gap-5 ${
          includeLargeScreen
            ? 'md:h-[560px] md:grid-cols-12 md:grid-rows-[1.08fr_0.92fr] lg:h-[590px]'
            : 'md:grid-cols-4'
        }`}>
          {visibleDevices.map((device, index) => {
            return (
              <motion.article
                key={device.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-zinc-900 md:min-h-0 md:rounded-[2rem] ${
                  includeLargeScreen ? `md:aspect-auto ${device.className}` : 'md:aspect-[3/4]'
                }`}
              >
                <img
                  src={device.image}
                  alt=""
                  className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/10 to-black/70" />
                <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
                  <div className="max-w-sm">
                    <h3 className="mb-2 text-xl font-bold tracking-tight text-white md:mb-3 md:text-3xl">
                      {device.title}
                    </h3>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DeviceSelection;
