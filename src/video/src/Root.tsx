import React from 'react';
import { Composition } from 'remotion';
import { HelloComposition } from './compositions/HelloComposition';
import {
  PhotoDump,
  QuoteCard,
  ProductShowcase,
  Listicle,
  TravelMontage,
  Motivational,
  BeforeAfter,
  DayInLife,
} from './templates';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloReelForge"
        component={HelloComposition}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* Phase 1 Template Compositions */}
      <Composition
        id="PhotoDump"
        component={PhotoDump}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="QuoteCard"
        component={QuoteCard}
        durationInFrames={10 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={12 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="Listicle"
        component={Listicle}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="TravelMontage"
        component={TravelMontage}
        durationInFrames={20 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="Motivational"
        component={Motivational}
        durationInFrames={8 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BeforeAfter"
        component={BeforeAfter}
        durationInFrames={12 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="DayInLife"
        component={DayInLife}
        durationInFrames={25 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
