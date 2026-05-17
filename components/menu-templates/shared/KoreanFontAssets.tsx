"use client";

import type { FontLoadAssets } from "@/lib/font-options";

type KoreanFontAssetsProps = {
  assets: FontLoadAssets | readonly FontLoadAssets[];
};

export default function KoreanFontAssets({ assets }: KoreanFontAssetsProps) {
  const assetList = Array.isArray(assets) ? assets : [assets];
  const dedupedAssets = assetList.filter((asset, index) => {
    const assetIdentity = asset.href ?? asset.cssText ?? asset.key;
    return assetList.findIndex((candidate) => (candidate.href ?? candidate.cssText ?? candidate.key) === assetIdentity) === index;
  });

  return (
    <>
      {dedupedAssets.map((asset) => {
        if (asset.href) {
          return <link key={asset.href} rel="stylesheet" href={asset.href} data-menu-font-asset={asset.key} />;
        }

        if (asset.cssText) {
          return (
            <style key={asset.key} data-menu-font-asset={asset.key}>
              {asset.cssText}
            </style>
          );
        }

        return null;
      })}
    </>
  );
}
