import React from 'react';
import { Composition } from 'remotion';
import { HelloComposition } from './compositions/HelloComposition';

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
    </>
  );
};
