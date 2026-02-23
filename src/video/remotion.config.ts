import { Config } from 'remotion';

Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setNumberOfGifLoops(null);
Config.setCrf(23);
Config.setPreset('medium');

export const fps = 30;
