'use client';

import { useState } from 'react';
import { trackEvent } from '@/components/GoogleAnalytics';
import MenuSelectionContext from '@/components/shop/MenuSelectionContext';
import { dishImage } from '@/lib/dish-images';
import ProductTags from '@/components/shop/ProductTags';
import {
  formatMenuOptionPrice,
  getMenuPriceCents,
  getMenuOptionImage,
  getMenuProductName,
  normalizeMenuSelection
} from '@/lib/menu-options';

const formatPrice = (priceCents) => `$${(priceCents / 100).toFixed(2)}`;

export default function MenuCustomizer({ product, config, initialSelection, children }) {
  const [selection, setSelection] = useState(() => normalizeMenuSelection(config, initialSelection));
  const isWings = config.isWings === true;
  const priceCents = getMenuPriceCents(config, selection);
  const image = getMenuOptionImage(product, config, selection, dishImage(product));
  const selectedProductName = getMenuProductName(config, selection) || product.name;
  const selectedOption = config.groups
    .map((group) => group.options.find((option) => option.id === selection[group.queryKey]))
    .find(Boolean);

  function changeOption(group, optionId) {
    const nextSelection = { ...selection, [group.queryKey]: optionId };
    const option = group.options.find((item) => item.id === optionId);
    if (!option) return;
    const nextProductName = getMenuProductName(config, nextSelection) || product.name;

    setSelection(nextSelection);
    const price = getMenuPriceCents(config, nextSelection);
    const query = new URLSearchParams(window.location.search);
    for (const selectionGroup of config.groups) {
      query.set(selectionGroup.queryKey, nextSelection[selectionGroup.queryKey]);
    }
    const route = config.routeBasePath && option.routeSlug
      ? `${config.routeBasePath}/${option.routeSlug}`
      : window.location.pathname;
    if (config.routeBasePath && option.routeSlug) query.delete(group.queryKey);
    const search = query.toString();
    const nextUrl = `${route}${search ? `?${search}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    document.title = `${nextProductName} in Redford, MI | Preva Kitchen`;
    window.dispatchEvent(new CustomEvent('preva:menu-product-name-change', {
      detail: { productName: nextProductName }
    }));

    trackEvent('menu_option_select', {
      item_id: product.slug,
      item_name: nextProductName,
      item_category: product.category,
      selection_group: group.queryKey,
      selection_id: option.id,
      selection_name: option.label,
      currency: 'USD',
      value: price / 100
    });
  }

  const selectedSummary = config.groups
    .map((group) => group.options.find((option) => option.id === selection[group.queryKey])?.label)
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <div className="ps-pdp__shot">
        {image ? (
          <img
            fetchPriority="high"
            src={image}
            alt={selectedOption?.imageAlt || `${selectedProductName} at Preva Kitchen`}
          />
        ) : (
          <div className="ps-product-photo-placeholder" role="img" aria-label={`${selectedProductName} photo unavailable`}>
            Product photo unavailable
          </div>
        )}
      </div>

      <div className="ps-pdp__info">
        <div>
          <span className="ps-kicker">{product.category}</span>
          <h1 className="ps-h1" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>{selectedProductName}</h1>
        </div>

        <div className="ps-menu-selection-row">
          <p className="ps-price ps-price--lg" aria-live="polite">{formatPrice(priceCents)}</p>
          {config.showSelector !== false && (
            <div className="ps-menu-selection">
              <div className="ps-menu-selection__fields">
                {config.groups.map((group) => (
                  <div key={group.queryKey}>
                    <label htmlFor={`menu-option-${group.queryKey}`}>{group.label}</label>
                    <select
                      id={`menu-option-${group.queryKey}`}
                      value={selection[group.queryKey]}
                      onChange={(event) => changeOption(group, event.target.value)}
                    >
                      {group.options.map((option) => (
                        <option value={option.id} key={option.id}>
                          {option.label} — {formatMenuOptionPrice(config, group, option, selection)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              {!isWings && (
              <div className="ps-menu-summary" aria-live="polite" aria-label="Selected options">
                {selectedSummary}
              </div>
              )}
            </div>
          )}
        </div>

        <ProductTags tags={product.tags} />
        {product.description && <p className="ps-lede">{product.description}</p>}

        <MenuSelectionContext.Provider value={{ priceCents, selection, productName: selectedProductName }}>
          {children}
        </MenuSelectionContext.Provider>
      </div>
    </>
  );
}
