/**
 * AdSlot — a single, static, clearly labelled ad for free accounts.
 * Pro (and anyone with the ad_free feature) never renders it.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useTheme } from '../../core/context/ThemeContext';
import { useSubscription } from '../subscription/useSubscription';
import { useAppAuth } from '../../core/context/AuthContext';
import { useEntitlement } from '../billing/EntitlementContext';
import {
  countHouseAdImpression,
  houseAdCapReached,
  houseAdIndex,
  isAdTestMode,
  resolveAdProvider,
  type AdPlacement,
} from './adConfig';
import { track } from '../../core/analytics';

const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
const HOUSE_ADS = ['billing.ads.house.noAds', 'billing.ads.house.routines', 'billing.ads.house.ai'];
/** Reserved height so filling an AdSense unit never shifts the layout (CLS). */
const ADSENSE_MIN_HEIGHT = 100;

let adsenseLoading: Promise<void> | null = null;

function loadAdSense(client: string): Promise<void> {
  if (adsenseLoading) return adsenseLoading;
  adsenseLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `${ADSENSE_SRC}?client=${encodeURIComponent(client)}`;
    script.onload = () => resolve();
    script.onerror = () => { adsenseLoading = null; reject(new Error('blocked')); };
    document.head.appendChild(script);
  });
  return adsenseLoading;
}

function AdFrame({ children, label }: { children: React.ReactNode; label: string }) {
  const { theme } = useTheme();
  return (
    <aside
      aria-label={label}
      style={{
        marginTop: theme.spacing.xl,
        padding: theme.spacing.md,
        borderRadius: theme.shape.radiusLg,
        border: `1px dashed ${theme.colors.border}`,
        background: theme.colors.surface,
      }}
    >
      <p style={{ margin: `0 0 ${theme.spacing.xs}px`, fontSize: '0.75rem', color: theme.colors.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      {children}
    </aside>
  );
}

function HouseAd({ placement }: { placement: AdPlacement }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const key = HOUSE_ADS[houseAdIndex(new Date().toISOString().slice(0, 10), HOUSE_ADS.length)];
  // Cap read once at mount; the ad stays visible for this mount even if the
  // counter now sits at the cap (one exposure, never a mid-view vanish).
  const [capReached] = useState(() => houseAdCapReached(sessionStorage, placement));
  // Ref guard: React StrictMode runs effects twice in development; the
  // impression must count once. (Production renders effects once, but the
  // guard also protects future remount-with-same-key cases.)
  const countedRef = useRef(false);
  useEffect(() => {
    // A capped-out mount renders nothing — never count or track a phantom
    // impression for an ad the person did not see.
    if (countedRef.current || capReached) return;
    countedRef.current = true;
    countHouseAdImpression(sessionStorage, placement);
    track('ad_impression', { provider: 'house', placement, creative: key });
  }, [placement, key, capReached]);
  if (capReached) return null;
  return (
    <AdFrame label={t('billing.ads.houseLabel')}>
      <p style={{ margin: 0 }}>{t(key)}</p>
      <Link to="/pricing" onClick={() => track('ad_click', { provider: 'house', placement, creative: key })}
        style={{ display: 'inline-block', marginTop: theme.spacing.xs, color: theme.colors.primary, fontWeight: 600, minHeight: 44, lineHeight: '44px' }}>
        {t('billing.ads.removeAds')}
      </Link>
    </AdFrame>
  );
}

function AdSenseAd({ placement, onFail }: { placement: AdPlacement; onFail: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLModElement>(null);
  const env = import.meta.env;
  const countedRef = useRef(false);
  useEffect(() => {
    loadAdSense(env.VITE_ADSENSE_CLIENT)
      .then(() => {
        const queue = ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []);
        queue.push({});
        if (!countedRef.current) {
          countedRef.current = true;
          track('ad_impression', { provider: 'adsense', placement, test: isAdTestMode(env) });
        }
      })
      .catch(onFail);
  }, [env, placement, onFail]);
  return (
    <AdFrame label={t('billing.ads.sponsoredLabel')}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: ADSENSE_MIN_HEIGHT }}
        data-ad-client={env.VITE_ADSENSE_CLIENT}
        data-ad-slot={env.VITE_ADSENSE_SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(isAdTestMode(env) ? { 'data-adtest': 'on' } : {})}
      />
    </AdFrame>
  );
}

export function AdSlot({ placement }: { placement: AdPlacement }) {
  const { hasFeature } = useSubscription();
  const { userId, authLoaded } = useAppAuth();
  const { entitlement } = useEntitlement();
  const [adsenseFailed, setAdsenseFailed] = useState(false);
  const markFailed = useCallback(() => setAdsenseFailed(true), []);
  // Until sign-in and the plan are known, show nothing: a Pro user must never see
  // an ad flash (or have AdSense load) while their plan is still loading.
  if (!authLoaded || (userId && !entitlement)) return null;
  if (hasFeature('ad_free')) return null;
  const provider = resolveAdProvider(import.meta.env, placement);
  if (provider === 'off') return null;
  if (provider === 'adsense' && !adsenseFailed) {
    return <AdSenseAd placement={placement} onFail={markFailed} />;
  }
  return <HouseAd placement={placement} />;
}

export default AdSlot;
