"use client";

import { Children, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Horizontal doctor-card carousel with autoplay, arrows, touch swipe, and RTL.
 * Presentation only — pass pre-built DoctorCard elements as children.
 */
export function DoctorsCarousel({ children, className }) {
  const { dir, t } = useLocale();
  const isRtl = dir === "rtl";

  const autoplayRef = useRef(
    Autoplay({
      delay: 4500,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  const [viewportRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      direction: isRtl ? "rtl" : "ltr",
      dragFree: false,
      containScroll: "trimSnaps",
    },
    [autoplayRef.current]
  );

  const slides = Children.toArray(children);
  const showNav = slides.length > 1;

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ direction: isRtl ? "rtl" : "ltr" });
  }, [emblaApi, isRtl]);

  const handleMouseEnter = useCallback(() => {
    autoplayRef.current.stop();
  }, []);

  const handleMouseLeave = useCallback(() => {
    autoplayRef.current.play();
  }, []);

  if (slides.length === 0) return null;

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      dir={dir}
    >
      <div className="overflow-hidden rounded-2xl" ref={viewportRef}>
        <div className="-ms-4 flex">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={cn(
                "min-w-0 shrink-0 grow-0 ps-4",
                "basis-full",
                "md:basis-1/2",
                "xl:basis-1/3"
              )}
            >
              <div className="flex h-full min-h-[420px] flex-col pb-1">
                {slide}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNav ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={scrollPrev}
            className={cn(
              "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 rounded-full border-border/80 bg-background/95 shadow-lg backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-background hover:shadow-xl sm:flex",
              "start-0 -translate-x-1/2 md:start-2 md:translate-x-0"
            )}
            aria-label={t("home.testimonialsPrev")}
          >
            <ChevronLeft
              className={cn("size-5", isRtl && "rotate-180")}
              aria-hidden
            />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={scrollNext}
            className={cn(
              "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 rounded-full border-border/80 bg-background/95 shadow-lg backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-background hover:shadow-xl sm:flex",
              "end-0 translate-x-1/2 md:end-2 md:translate-x-0"
            )}
            aria-label={t("home.testimonialsNext")}
          >
            <ChevronRight
              className={cn("size-5", isRtl && "rotate-180")}
              aria-hidden
            />
          </Button>
        </>
      ) : null}

      <div
        className="pointer-events-none absolute inset-y-0 start-0 z-[1] w-8 bg-gradient-to-r from-background to-transparent md:w-12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 end-0 z-[1] w-8 bg-gradient-to-l from-background to-transparent md:w-12"
        aria-hidden
      />
    </div>
  );
}
