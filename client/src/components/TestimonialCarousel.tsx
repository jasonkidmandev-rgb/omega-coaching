import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, ChevronLeft, ChevronRight, Play, TrendingDown, Zap, Clock, User, ArrowRight, Star, ExternalLink } from "lucide-react";

interface Testimonial {
  id: number;
  type: "quote" | "video" | "cta";
  content?: string;
  author?: string;
  location?: string;
  result?: string;
  resultIcon?: "weight" | "energy" | "time";
  photo?: string;
  beforeAfterPhotos?: { before?: string; after?: string; during?: string; grid?: string };
  videoUrl?: string;
  videoTitle?: string;
  ctaLink?: string;
  ctaText?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    type: "quote",
    content: "In just 2 months I went from size 38 pants to size 34! This truly helped me not just destroy my plateau but I never imagined I would be weighing in at 233 lbs. and size 34 waist in just 2 months... And, damn, Do I Look GOOD! Loving it!",
    author: "Sam T.",
    location: "Texas",
    result: "22 lbs lost in 2 months",
    resultIcon: "weight",
    beforeAfterPhotos: {
      before: "/testimonial-sam-before.jpg",
      during: "/testimonial-sam-during.jpg",
      after: "/testimonial-sam-after.jpg",
    },
  },
  {
    id: 2,
    type: "quote",
    content: "I have steadily lost a total of 31 pounds, and the inflammation is gone from the Hashimotos. For the first time in years, I am able to get through a full day without napping or dragging. I am a school teacher with 5 children of my own at home, feeling like this is so important.",
    author: "Kira H.",
    location: "Utah",
    result: "31 lbs lost, inflammation gone",
    resultIcon: "weight",
  },
  {
    id: 3,
    type: "quote",
    content: "This is the sixth week of work, and I have lost 16 lbs. of fat and gained 5 lbs. of muscle. I feel good and look better than I have in years. Jason cares about my health more than me some days! He is passionate!",
    author: "David H.",
    result: "16 lbs fat lost, 5 lbs muscle gained in 6 weeks",
    resultIcon: "weight",
    beforeAfterPhotos: {
      grid: "/testimonial-david-grid.jpeg",
    },
  },
  {
    id: 4,
    type: "video",
    videoUrl: "https://www.youtube-nocookie.com/embed/lc5kPWKoG9Y?si=Ip-a28XTCkjF6BmO&rel=0&modestbranding=1",
    videoTitle: "How Nicole Reversed Inflammation, Fatigue and Weight Gain in 15 Months",
    author: "Nicole",
  },
  {
    id: 8,
    type: "video",
    videoUrl: "https://www.youtube-nocookie.com/embed/fGtOaoUNgEY?rel=0&modestbranding=1",
    videoTitle: "Brian's Peptide Coaching Transformation Story",
    author: "Brian Riseland",
  },
  {
    id: 5,
    type: "quote",
    content: "I believe the greatest take away was that it helped me make the lifestyle changes I needed to for continued health in the future. My follow up labs have taken me down from Pre Diabetic, so that's probably the greatest success of my 12 weeks.",
    author: "Jill R.",
    result: "18 lbs lost, reversed pre-diabetic",
    resultIcon: "weight",
  },
  {
    id: 6,
    type: "quote",
    content: "I have been working with Jason for 60 days and he gave me a peptide protocol for me, really centered around longevity, energy levels, and putting on muscle/leaning down. Jason was fantastic and continues to be fantastic!",
    author: "Chris Hansen",
    result: "60-day transformation",
    resultIcon: "time",
    photo: "/testimonial-chris.jpeg",
    beforeAfterPhotos: {
      before: "/testimonial-chris.jpeg",
      after: "/testimonial-chris-after.jpeg",
    },
  },
  {
    id: 7,
    type: "quote",
    content: "I am really pleased with my protocol. I've lost 2 pounds each week since we've started. Even more, I have benefited from the decreased 'noise' and ability to focus whether on a workout or my work.",
    author: "Nicole Cobb",
    location: "Nashville, TN",
    result: "2 lbs/week consistently",
    resultIcon: "weight",
  },
  {
    id: 9,
    type: "quote",
    content: "When I started this journey, I was at 234 pounds. This morning, I hit 206\u2014and the transformation goes far beyond the scale. My body composition has changed significantly, and I'm in the best shape I've been in for years. I recently had my physical to renew a 20-year term life insurance policy, and the improved results not only reflect my health progress but also brought some serious long-term savings. That alone makes this whole experience more than worth it.",
    author: "Brian Wyatt",
    result: "234 lbs \u2192 206 lbs, best shape in years",
    resultIcon: "weight",
    beforeAfterPhotos: {
      before: "/testimonial-brian.jpg",
      after: "/testimonial-brian.jpg",
    },
    photo: "/testimonial-brian.jpg",
  },
  {
    id: 10,
    type: "cta",
    ctaLink: "https://omegalongevity.com/success-stories/",
    ctaText: "See More Transformations",
  },
];

const ResultIcon = ({ type }: { type?: "weight" | "energy" | "time" }) => {
  switch (type) {
    case "weight":
      return <TrendingDown className="h-3.5 w-3.5" />;
    case "energy":
      return <Zap className="h-3.5 w-3.5" />;
    case "time":
      return <Clock className="h-3.5 w-3.5" />;
    default:
      return <TrendingDown className="h-3.5 w-3.5" />;
  }
};

interface TestimonialCarouselProps {
  variant?: "default" | "navy";
}

export function TestimonialCarousel({ variant = "default" }: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const isNavy = variant === "navy";

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  // Auto-rotation every 8 seconds (longer for video content)
  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 8000);

    return () => clearInterval(interval);
  }, [isPaused, nextSlide]);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <section className="py-16 md:py-20 px-4">
      <div className="container max-w-6xl">
        <div className="text-center mb-12">
          <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${isNavy ? 'text-white' : 'text-gray-900'}`}>Real Client Results</h2>
          <p className={`max-w-2xl mx-auto ${isNavy ? 'text-white/70' : 'text-gray-600'}`}>
            Hear from real clients about their transformation journey with Omega Longevity
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Carousel Container */}
          <div 
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${
                isNavy 
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
              aria-label="Previous testimonial"
            >
              <ChevronLeft className={`h-5 w-5 md:h-6 md:w-6 ${isNavy ? 'text-white' : 'text-gray-700'}`} />
            </button>

            <button
              onClick={nextSlide}
              className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-md ${
                isNavy 
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20' 
                  : 'bg-white hover:bg-gray-50 border border-gray-200'
              }`}
              aria-label="Next testimonial"
            >
              <ChevronRight className={`h-5 w-5 md:h-6 md:w-6 ${isNavy ? 'text-white' : 'text-gray-700'}`} />
            </button>

            {/* Testimonial Content */}
            <div className="overflow-hidden">
              <div 
                className="transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                <div className="flex">
                  {testimonials.map((testimonial, index) => (
                    <div 
                      key={testimonial.id} 
                      className="w-full flex-shrink-0 px-4"
                      style={{ minWidth: '100%' }}
                    >
                      {testimonial.type === "quote" ? (
                        <Card className={`border-2 ${
                          isNavy 
                            ? 'bg-white/5 backdrop-blur border-white/10' 
                            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                        }`}>
                          <CardContent className="p-8 md:p-12">
                            {testimonial.result && (
                              <div className="flex justify-center mb-4">
                                <Badge className={`flex items-center gap-1.5 px-3 py-1 ${
                                  isNavy 
                                    ? 'bg-amber-500 text-white border-0' 
                                    : 'bg-green-100 text-green-700 border-green-200'
                                }`}>
                                  <ResultIcon type={testimonial.resultIcon} />
                                  {testimonial.result}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Client Photo / Before-After Photos */}
                            <div className="flex justify-center mb-6">
                              {testimonial.beforeAfterPhotos?.grid ? (
                                /* Grid photo (David H. 6-pic transformation) */
                                <div className="w-full max-w-md rounded-xl overflow-hidden shadow-lg border-2 border-amber-300">
                                  <img 
                                    src={testimonial.beforeAfterPhotos.grid} 
                                    alt={`${testimonial.author} - Before & After Transformation`}
                                    className="w-full h-auto object-contain"
                                  />
                                </div>
                              ) : testimonial.beforeAfterPhotos?.before && testimonial.beforeAfterPhotos?.after && !testimonial.beforeAfterPhotos?.during ? (
                                /* Before/After side by side */
                                <div className="flex gap-3 items-center">
                                  <div className="text-center">
                                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 shadow-lg ${
                                      isNavy ? 'border-red-400' : 'border-red-300'
                                    }`}>
                                      <img 
                                        src={testimonial.beforeAfterPhotos.before} 
                                        alt={`${testimonial.author} - Before`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    </div>
                                    <span className={`text-xs font-medium mt-1 block ${isNavy ? 'text-white/60' : 'text-gray-500'}`}>Before</span>
                                  </div>
                                  <ArrowRight className={`h-5 w-5 flex-shrink-0 ${isNavy ? 'text-amber-400' : 'text-amber-500'}`} />
                                  <div className="text-center">
                                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 shadow-lg ${
                                      isNavy ? 'border-green-400' : 'border-green-300'
                                    }`}>
                                      <img 
                                        src={testimonial.beforeAfterPhotos.after} 
                                        alt={`${testimonial.author} - After`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    </div>
                                    <span className={`text-xs font-medium mt-1 block ${isNavy ? 'text-white/60' : 'text-gray-500'}`}>After</span>
                                  </div>
                                </div>
                              ) : testimonial.beforeAfterPhotos?.before && testimonial.beforeAfterPhotos?.during && testimonial.beforeAfterPhotos?.after ? (
                                /* Before/During/After (Sam T.) */
                                <div className="flex gap-2 md:gap-3 items-center">
                                  <div className="text-center">
                                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-3 shadow-lg ${
                                      isNavy ? 'border-red-400' : 'border-red-300'
                                    }`}>
                                      <img 
                                        src={testimonial.beforeAfterPhotos.before} 
                                        alt={`${testimonial.author} - Before`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    </div>
                                    <span className={`text-xs font-medium mt-1 block ${isNavy ? 'text-white/60' : 'text-gray-500'}`}>Before</span>
                                  </div>
                                  <ArrowRight className={`h-4 w-4 flex-shrink-0 ${isNavy ? 'text-amber-400' : 'text-amber-500'}`} />
                                  <div className="text-center">
                                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-3 shadow-lg ${
                                      isNavy ? 'border-amber-400' : 'border-amber-300'
                                    }`}>
                                      <img 
                                        src={testimonial.beforeAfterPhotos.during} 
                                        alt={`${testimonial.author} - During`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    </div>
                                    <span className={`text-xs font-medium mt-1 block ${isNavy ? 'text-white/60' : 'text-gray-500'}`}>During</span>
                                  </div>
                                  <ArrowRight className={`h-4 w-4 flex-shrink-0 ${isNavy ? 'text-amber-400' : 'text-amber-500'}`} />
                                  <div className="text-center">
                                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-3 shadow-lg ${
                                      isNavy ? 'border-green-400' : 'border-green-300'
                                    }`}>
                                      <img 
                                        src={testimonial.beforeAfterPhotos.after} 
                                        alt={`${testimonial.author} - After`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                    </div>
                                    <span className={`text-xs font-medium mt-1 block ${isNavy ? 'text-white/60' : 'text-gray-500'}`}>After</span>
                                  </div>
                                </div>
                              ) : testimonial.photo ? (
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 shadow-lg ${
                                  isNavy ? 'border-amber-500' : 'border-amber-300'
                                }`}>
                                  <img 
                                    src={testimonial.photo} 
                                    alt={testimonial.author}
                                    className="w-full h-full object-cover object-top"
                                  />
                                </div>
                              ) : (
                                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 shadow-lg flex items-center justify-center ${
                                  isNavy 
                                    ? 'bg-white/10 border-amber-500' 
                                    : 'bg-gradient-to-br from-amber-200 to-orange-200 border-amber-300'
                                }`}>
                                  <User className={`h-10 w-10 md:h-12 md:w-12 ${isNavy ? 'text-white/70' : 'text-amber-600'}`} />
                                </div>
                              )}
                            </div>
                            
                            <blockquote className="text-center">
                              <div className="flex justify-center mb-4">
                                <Quote className={`h-6 w-6 ${isNavy ? 'text-amber-500' : 'text-amber-400'}`} />
                              </div>
                              <p className={`text-lg md:text-xl leading-relaxed mb-6 italic ${
                                isNavy ? 'text-white/90' : 'text-gray-700'
                              }`}>
                                "{testimonial.content}"
                              </p>
                              <footer className="text-amber-500 font-semibold text-lg">
                                — {testimonial.author}
                                {testimonial.location && (
                                  <span className={`font-normal text-base ml-1 ${isNavy ? 'text-white/50' : 'text-gray-500'}`}>
                                    ({testimonial.location})
                                  </span>
                                )}
                              </footer>
                            </blockquote>
                          </CardContent>
                        </Card>
                      ) : testimonial.type === "cta" ? (
                        /* Success Stories CTA Slide */
                        <Card className={`border-2 ${
                          isNavy 
                            ? 'bg-white/5 backdrop-blur border-white/10' 
                            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                        }`}>
                          <CardContent className="p-8 md:p-16 flex flex-col items-center justify-center text-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
                              isNavy ? 'bg-amber-500/20' : 'bg-amber-100'
                            }`}>
                              <Star className={`h-10 w-10 ${isNavy ? 'text-amber-400' : 'text-amber-500'}`} />
                            </div>
                            <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${isNavy ? 'text-white' : 'text-gray-900'}`}>
                              These Are Just a Few of Our Success Stories
                            </h3>
                            <p className={`text-lg mb-8 max-w-xl ${isNavy ? 'text-white/70' : 'text-gray-600'}`}>
                              Dozens more clients have shared their transformations on the original Omega Longevity success stories page. 
                              See the full collection of before-and-after results, video testimonials, and detailed journeys.
                            </p>
                            <a
                              href={testimonial.ctaLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 shadow-lg ${
                                isNavy 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600' 
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                              }`}
                            >
                              <ExternalLink className="h-5 w-5" />
                              {testimonial.ctaText}
                            </a>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card className={`${isNavy ? 'bg-white/5 backdrop-blur border-white/10' : 'bg-white border-gray-200'}`}>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Play className="h-5 w-5 text-amber-500" />
                              <span className={`text-sm ${isNavy ? 'text-white/70' : 'text-gray-700'}`}>{testimonial.videoTitle}</span>
                            </div>
                            <div className="aspect-video rounded-lg overflow-hidden">
                              <iframe 
                                width="100%" 
                                height="100%"
                                src={testimonial.videoUrl}
                                title={testimonial.videoTitle}
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerPolicy="strict-origin-when-cross-origin" 
                                allowFullScreen
                              />
                            </div>
                            {testimonial.author && (
                              <p className="text-center text-amber-500 font-semibold mt-4">
                                — {testimonial.author}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentIndex 
                      ? 'bg-amber-500 w-8' 
                      : isNavy ? 'bg-white/30 hover:bg-white/50' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Results Disclaimer */}
          <p className={`text-center text-xs mt-8 max-w-2xl mx-auto ${isNavy ? 'text-white/40' : 'text-gray-500'}`}>
            * Individual results may vary. Testimonials reflect personal experiences and are not guaranteed outcomes. 
            Results depend on individual factors including adherence to protocols, lifestyle, genetics, and overall health. 
            Always consult with a healthcare professional before starting any new health or fitness program.
          </p>
        </div>
      </div>
    </section>
  );
}

export default TestimonialCarousel;
