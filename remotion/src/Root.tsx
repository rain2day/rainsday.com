import { Composition } from "remotion";
import { HeroSignal } from "./compositions/HeroSignal";
import { MissionSignal } from "./compositions/MissionSignal";
import { ProductSignal } from "./compositions/ProductSignal";
import { CampaignSignal } from "./compositions/CampaignSignal";
import { CobaltSubject } from "./compositions/v2/CobaltSubject";

export const RemotionRoot = () => {
  return (
    <>
      {/* V1 */}
      <Composition id="HeroSignal" component={HeroSignal} durationInFrames={360} fps={30} width={1920} height={1080} />
      <Composition id="MissionSignal" component={MissionSignal} durationInFrames={300} fps={30} width={1920} height={640} />
      <Composition id="ProductSignal" component={ProductSignal} durationInFrames={300} fps={30} width={1920} height={640} />
      <Composition id="CampaignSignal" component={CampaignSignal} durationInFrames={300} fps={30} width={1920} height={640} />

      {/* V2 — Behance cobalt cover */}
      <Composition
        id="CobaltSubject"
        component={CobaltSubject}
        durationInFrames={360}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
