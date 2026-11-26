import type { ConfigContext, ExpoConfig } from 'expo/config';
import { type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

const EXTERNAL_MAP_SCHEMES = ['google.navigation', 'geo'];

/**
 * Ensures Android 11+ (API 30+) package visibility allows resolving external
 * navigation intents (Google Maps `google.navigation:` and `geo:` schemes).
 */
const withAndroidNavigationQueries: ConfigPlugin = (expoConfig) =>
  withAndroidManifest(expoConfig, (configResult) => {
    const manifest = configResult.modResults.manifest;
    if (!manifest.queries) {
      manifest.queries = [];
    }
    if (manifest.queries.length === 0) {
      manifest.queries.push({ intent: [] });
    }

    const queryBlock = manifest.queries[0];
    if (!queryBlock.intent) {
      queryBlock.intent = [];
    }

    const existingSchemes = new Set(
      queryBlock.intent
        .flatMap((intentItem) => intentItem.data ?? [])
        .map((dataItem) => dataItem.$?.['android:scheme'])
        .filter((scheme): scheme is string => Boolean(scheme))
    );

    for (const scheme of EXTERNAL_MAP_SCHEMES) {
      if (!existingSchemes.has(scheme)) {
        queryBlock.intent.push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [{ $: { 'android:scheme': scheme } }],
        });
      }
    }

    return configResult;
  });

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleMapsApiKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim() ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY?.trim() ||
    undefined;

  const basePlugins = config.plugins ?? [];
  const mapsPluginEntry: NonNullable<ExpoConfig['plugins']>[number] = androidGoogleMapsApiKey
    ? ['react-native-maps', { androidGoogleMapsApiKey }]
    : ['react-native-maps', {}];

  const mergedPlugins: NonNullable<ExpoConfig['plugins']> = basePlugins.map((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    return pluginName === 'react-native-maps' ? mapsPluginEntry : plugin;
  });

  if (
    !mergedPlugins.some((plugin) =>
      Array.isArray(plugin) ? plugin[0] === 'react-native-maps' : plugin === 'react-native-maps'
    )
  ) {
    mergedPlugins.push(mapsPluginEntry);
  }

  const configuredExpo: ExpoConfig = {
    ...config,
    name: config.name ?? 'CityCare Mobile',
    slug: config.slug ?? 'CityCareMobile',
    plugins: mergedPlugins,
    android: {
      ...config.android,
      ...(androidGoogleMapsApiKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: {
                ...config.android?.config?.googleMaps,
                apiKey: androidGoogleMapsApiKey,
              },
            },
          }
        : {}),
    },
  };

  return withAndroidNavigationQueries(configuredExpo);
};
