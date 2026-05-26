import { Composition } from "remotion";
import { HeroSignal } from "./compositions/HeroSignal";
import { MissionSignal } from "./compositions/MissionSignal";
import { ProductSignal } from "./compositions/ProductSignal";
import { CampaignSignal } from "./compositions/CampaignSignal";

export const RemotionRoot = () => {
  return (
    <>
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
    </>
  );
};
