import { useEffect, useState } from "react";
import { WIDE_LAYOUT_MEDIA_QUERY } from "@/components/logistica/lib/constants";

export function useWideLogisticsLayout() {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(WIDE_LAYOUT_MEDIA_QUERY);
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isWide;
}
