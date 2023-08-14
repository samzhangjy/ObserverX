import { Platform } from '@observerx/core';

export const availablePlatforms = ['qq'] as const;

type AvailablePlatform = (typeof availablePlatforms)[number];

const platforms: Map<AvailablePlatform, Platform> = new Map<AvailablePlatform, Platform>();

export default platforms;
