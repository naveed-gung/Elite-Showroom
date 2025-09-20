import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useShowroom } from '../store/useShowroom';

// Cinematic overlay for per-stage car info
// Stages: 0 name/year, 1 price, 2 hp, 3 total made
const CarStageOverlay: React.FC = () => {
		const { activeCountry, cameraStage, carMeta, cars } = useShowroom();
		const isCar = activeCountry === 'Japan' || activeCountry === 'Germany' || activeCountry === 'USA';

	const meta = carMeta[activeCountry];
	const car = cars[activeCountry];
	const base = car?.parts?.[0]?.data;

	const content = useMemo(() => {
		if (!base) return null;
		if (cameraStage === 0) {
			return {
				title: meta?.name || activeCountry,
				subtitle: `Year ${base.year}`,
			};
		}
		if (cameraStage === 1) {
			const price = base.price;
			const pretty = price >= 1000000 ? `$${(price/1000000).toFixed(1)}M` : `$${price.toLocaleString()}`;
			return { title: pretty, subtitle: 'Price' };
		}
		if (cameraStage === 2) {
			return { title: `${base.hp} HP`, subtitle: 'Horsepower' };
		}
		return { title: `${base.count}`, subtitle: 'Units Built' };
	}, [base, cameraStage, meta, activeCountry]);

			// Layout per stage
			const layout = useMemo(() => {
				const baseClass = `backdrop-blur-2xl border bg-white/6 border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.55)] pointer-events-none`;
				// Defaults: centered panel
				let style: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
				let className = `${baseClass} rounded-3xl px-8 py-6`;
				let titleClass = 'text-luxury font-semibold tracking-[0.2em] text-[clamp(20px,4vw,40px)]';
				let subtitleClass = 'body-elegant text-[hsl(var(--muted-foreground))] mt-2';
				let minHeight: number | undefined = undefined;

				switch (cameraStage) {
					case 0: // lower center, not over car
						style = {
							left: '50%',
							transform: 'translateX(-50%)',
							bottom: 'calc(var(--footer-height) + 24px)'
						} as React.CSSProperties;
						className = `${baseClass} rounded-3xl px-8 py-5`;
						break;
					case 1: // right side, at least 50px height
						style = { right: '32px', top: '30%' } as React.CSSProperties;
						className = `${baseClass} rounded-2xl px-5 py-3 text-right`;
						minHeight = 50;
						break;
					case 2: // right side, about 20px height, compact
						style = { right: '32px', top: '36%' } as React.CSSProperties;
						className = `${baseClass} rounded-xl px-4 py-1.5 text-right`;
						titleClass = 'text-luxury font-semibold tracking-[0.18em] text-[clamp(16px,3vw,28px)]';
						subtitleClass = 'body-elegant text-[hsl(var(--muted-foreground))] mt-1 text-xs';
						minHeight = 20;
						break;
					case 3: // left side, at least 70px height
					default:
						style = { right: '32px', top: '30%' } as React.CSSProperties;
						className = `${baseClass} rounded-2xl px-6 py-4 text-left`;
						minHeight = 70;
						break;
				}
				return { style, className, titleClass, subtitleClass, minHeight };
			}, [cameraStage]);

			return (
				<div className="pointer-events-none fixed inset-0 z-40">
					<AnimatePresence mode="wait">
						{isCar && content && (
							<motion.div
								key={`${activeCountry}-${cameraStage}`}
								initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
								animate={{ opacity: 1, scale: 1.0, filter: 'blur(0px)' }}
								exit={{ opacity: 0, scale: 0.96, filter: 'blur(6px)' }}
								transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
								className={layout.className}
								style={{
									position: 'fixed',
									...layout.style,
									minHeight: layout.minHeight,
									backgroundImage: 'radial-gradient(1200px 600px at 50% -20%, rgba(255,255,255,0.1), rgba(255,255,255,0.02))',
								}}
							>
								<div className="text-center md:text-inherit">
									<motion.h2
										className={layout.titleClass}
										initial={{ y: 8, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{ duration: 0.6, delay: 0.05 }}
									>
										{content.title}
									</motion.h2>
									<motion.p
										className={layout.subtitleClass}
										initial={{ y: 6, opacity: 0 }}
										animate={{ y: 0, opacity: 1 }}
										transition={{ duration: 0.6, delay: 0.12 }}
									>
										{content.subtitle}
									</motion.p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			);
};

export default CarStageOverlay;
