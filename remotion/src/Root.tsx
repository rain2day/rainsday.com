import { Composition } from "remotion";
import { HeroSignal } from "./compositions/HeroSignal";
import { MissionSignal } from "./compositions/MissionSignal";
import { ProductSignal } from "./compositions/ProductSignal";
import { CampaignSignal } from "./compositions/CampaignSignal";
import { HeroInk } from "./compositions/v2/HeroInk";
import { LineTransition } from "./compositions/v2/LineTransition";
import { BrushTimeline } from "./compositions/v2/BrushTimeline";
import { KomonPattern } from "./compositions/v2/KomonPattern";

export const RemotionRoot = () => {
  return (
    <>
      {/* V1 */}
      <Composition
        id="HeroSignal"
        component={HeroSignal}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MissionSignal"
        component={MissionSignal}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={640}
      />
      <Composition
        id="ProductSignal"
        component={ProductSignal}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={640}
      />
      <Composition
        id="CampaignSignal"
        component={CampaignSignal}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={640}
      />

      {/* V2 — editorial Japanese */}
      <Composition
        id="HeroInk"
        component={HeroInk}
        durationInFrames={420}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="LineTransition"
        component={LineTransition}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={320}
      />
      <Composition
        id="BrushTimeline"
        component={BrushTimeline}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={260}
      />
      <Composition
        id="KomonPattern"
        component={KomonPattern}
        durationInFrames={360}
        fps={30}
        width={1920}
        height={640}
      />
    </>
  );
};
