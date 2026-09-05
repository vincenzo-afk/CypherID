// Protection profiles — values from docs/protection/profiles/01..04
// NEVER invent new profiles. LOW/MEDIUM/HIGH/EXTREME only.
export const PROFILES = {
  LOW: {
    name: 'LOW',
    watermarkOpacity: 0.08,
    temporalFrequencyHz: 0,
    spatialDitherIntensity: 0,
    rollingShutterEnabled: false,
    sessionTTLMinutes: 60,
    parameterRotationIntervalMs: 300000,
    obscureOnFocusLoss: false
  },
  MEDIUM: {
    name: 'MEDIUM',
    watermarkOpacity: 0.12,
    temporalFrequencyHz: 15,
    spatialDitherIntensity: 0.05,
    rollingShutterEnabled: false,
    sessionTTLMinutes: 30,
    parameterRotationIntervalMs: 300000,
    obscureOnFocusLoss: false
  },
  HIGH: {
    name: 'HIGH',
    watermarkOpacity: 0.18,
    temporalFrequencyHz: 30,
    spatialDitherIntensity: 0.15,
    rollingShutterEnabled: true,
    sessionTTLMinutes: 20,
    parameterRotationIntervalMs: 120000,
    obscureOnFocusLoss: true
  },
  EXTREME: {
    name: 'EXTREME',
    watermarkOpacity: 0.25,
    temporalFrequencyHz: 60,
    spatialDitherIntensity: 0.3,
    rollingShutterEnabled: true,
    sessionTTLMinutes: 10,
    parameterRotationIntervalMs: 60000,
    obscureOnFocusLoss: true
  }
};

export function getProfile(name) {
  return PROFILES[name] || PROFILES.MEDIUM;
}
