'use client';

import { useMemo, useState } from 'react';
import { money, useCart } from './ShopProvider';

/**
 * Option picking on the product page.
 *
 * The running price shown on the button is computed here for the customer's
 * benefit only. The server re-derives it from the database at checkout, so a
 * mismatch changes what appears on screen and never what is charged.
 */
export default function ProductBuy({ product }) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');

  const groups = product.optionGroups || [];

  const [chosen, setChosen] = useState(() => {
    const seed = {};
    for (const group of groups) {
      // A required single-choice group starts on its first option so the price
      // on the button is the price that would actually be charged.
      seed[group.id] = group.type === 'radio' && group.required && group.options[0] ? [group.options[0].id] : [];
    }
    return seed;
  });

  const toggle = (group, optionId) => {
    setChosen((previous) => {
      const current = previous[group.id] || [];
      if (group.type === 'radio') return { ...previous, [group.id]: [optionId] };
      if (current.includes(optionId)) {
        return { ...previous, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.maxPick > 0 && current.length >= group.maxPick) return previous;
      return { ...previous, [group.id]: [...current, optionId] };
    });
  };

  const { extraCents, optionIds, optionLabel } = useMemo(() => {
    let extra = 0;
    const ids = [];
    const labels = [];
    for (const group of groups) {
      for (const id of chosen[group.id] || []) {
        const option = group.options.find((o) => o.id === id);
        if (!option) continue;
        extra += option.priceCents;
        ids.push(option.id);
        labels.push(option.label);
      }
    }
    return { extraCents: extra, optionIds: ids, optionLabel: labels.join(', ') };
  }, [chosen, groups]);

  const missing = groups.filter((group) => group.required && (chosen[group.id] || []).length === 0);
  const unitCents = product.priceCents + extraCents;

  return (
    <>
      {groups.map((group) => (
        <div key={group.id}>
          <span className="ps-label">
            {group.label} <em>&middot; {group.required ? 'required' : 'optional'}</em>
          </span>
          <div className="ps-opts">
            {group.options.map((option) => (
              <button
                key={option.id}
                aria-pressed={(chosen[group.id] || []).includes(option.id)}
                onClick={() => toggle(group, option.id)}
              >
                {option.label}
                {option.priceCents > 0 && ` +${money(option.priceCents)}`}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="ps-field">
        <label htmlFor="ps-note">Anything the kitchen should know</label>
        <input
          id="ps-note"
          type="text"
          maxLength={200}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="No onions, extra sauce&hellip;"
        />
      </div>

      <div className="ps-buy">
        <span className="ps-step">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One less">−</button>
          <b>{qty}</b>
          <button onClick={() => setQty((q) => Math.min(30, q + 1))} aria-label="One more">+</button>
        </span>
        <button
          className="ps-btn ps-btn--gold"
          style={{ maxWidth: '320px', padding: '0 24px' }}
          disabled={!product.available || missing.length > 0}
          onClick={() => {
            cart.add({
              itemId: product.id,
              name: product.name,
              image: product.image,
              unitCents,
              qty,
              optionIds,
              optionLabel,
              note: note.trim()
            });
            setQty(1);
            setNote('');
          }}
        >
          {!product.available
            ? 'Sold out'
            : missing.length > 0
              ? `Choose ${missing[0].label.toLowerCase()}`
              : `Add to order — ${money(unitCents * qty)}`}
        </button>
      </div>
    </>
  );
}
