import React, {useRef, useState, useEffect} from 'react'

const TrendingPrints = ({dailyPrint, selectedPrinter, menuOpen, truncateString}) => {
      // auto-scroll on the home page trending prints
      const trendingRef = useRef(null);
      const [trendingIndex, setTrendingIndex] = useState(0);
      useEffect(() => {
          console.log('trending index updated: ', trendingIndex)
    
        if (!trendingRef.current || !dailyPrint?.length) return;
    
        const interval = setInterval(() => {
          const card = trendingRef?.current?.children[0];
          if (!card) return;
    
          const cardWidth = card.offsetWidth + 10; // +gap from CSS column-gap
          const nextIndex = (trendingIndex + 1) % dailyPrint.length;
    
          trendingRef.current.scrollTo({
            left: nextIndex * cardWidth,
            behavior: "smooth",
          });
    
          setTrendingIndex(nextIndex);
        }, 10000);
        return () => clearInterval(interval);
      }, [trendingIndex, dailyPrint]);
    
      // keep index in sync with manual scrolling
        useEffect(() => {
          const el = trendingRef.current;
          if (!el) return;
    
    
          const handleScroll = () => {
            if (!el?.children?.length) return;
    
            const cardWidth = el.children[0].offsetWidth + 10;
            const newIndex = Math.round(el.scrollLeft / cardWidth);
            setTrendingIndex(newIndex);
          };
    
          el.addEventListener("scroll", handleScroll, { passive: true });
          console.log('trending scroll listener attached: ', el)
    
          return () => {el.removeEventListener("scroll", handleScroll)}
        }, [trendingRef.current, dailyPrint]);
    
    

        return (
            <div>
                {(dailyPrint.length != 0) ? <>
                  <div ref={trendingRef} className={'stl-previews ' + ((!selectedPrinter && !menuOpen) ? '' : 'hidden')}>
                    {dailyPrint?.map((item) => {
                      return (
                        <a target="_blank" rel="noreferrer" className="print-card" href={item.link}>
                          <div className="image-4-3">
                            <img src={item.imgLink}></img>
                          </div>
                          <h3 style={{ marginTop: '5px' }}>{truncateString(item.name, 55)}</h3>
                        </a>

                      )
                    })
                    }
                  </div>
                </> : <>
                  <h2>No trending prints! Check again later.</h2>
                </>}

              </div>
        )
}
export default TrendingPrints;
