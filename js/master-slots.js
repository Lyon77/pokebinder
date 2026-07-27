const NUMBER_VARIANTS_BY_CARD_ID = Object.freeze({
  'ecard2-50': Object.freeze(['a', 'b']),
  'ecard2-74': Object.freeze(['a', 'b']),
  'ecard2-95': Object.freeze(['a', 'b']),
  'ecard2-103': Object.freeze(['a', 'b']),
});

function normalizeNumberVariant(value) {
  return value === 'a' || value === 'b' ? value : '';
}

function supportedNumberVariants(cardId) {
  return Object.prototype.hasOwnProperty.call(NUMBER_VARIANTS_BY_CARD_ID, cardId)
    ? NUMBER_VARIANTS_BY_CARD_ID[cardId]
    : null;
}

function normalizeNumberVariantForCard(cardId, value) {
  const numberVariant = normalizeNumberVariant(value);
  const supported = supportedNumberVariants(cardId);
  return numberVariant && supported && supported.includes(numberVariant)
    ? numberVariant
    : '';
}

function numberVariantsForCard(card) {
  const variants = card && supportedNumberVariants(card.id);
  return variants ? [...variants] : [];
}

function buildMasterSlotId(cardId, variant, numberVariant) {
  const suffix = normalizeNumberVariantForCard(cardId, numberVariant);
  return suffix
    ? `${cardId}:${suffix}:${variant}`
    : `${cardId}:${variant}`;
}

function setDisplayNumberVariant(displayNumber, numberVariant) {
  const suffix = normalizeNumberVariant(numberVariant);
  const value = String(displayNumber || '');
  const slashIndex = value.indexOf('/');
  const numerator = slashIndex === -1 ? value : value.slice(0, slashIndex);
  const denominator = slashIndex === -1 ? '' : value.slice(slashIndex);
  const baseNumber = numerator.replace(/[ab]$/i, '');
  return `${baseNumber}${suffix}${denominator}`;
}

function compactMasterSlot(slot) {
  const compact = { c: slot.cardId, v: slot.variant };
  const numberVariant = normalizeNumberVariantForCard(slot.cardId, slot.numberVariant);
  if (numberVariant) compact.n = numberVariant;
  return compact;
}

function expandCompactMasterSlot(compact) {
  const numberVariant = normalizeNumberVariantForCard(compact.c, compact.n);
  const slot = {
    cardId: compact.c,
    variant: compact.v,
    slotId: buildMasterSlotId(compact.c, compact.v, numberVariant),
  };
  if (numberVariant) slot.numberVariant = numberVariant;
  return slot;
}

function hydrateMasterSlot(stub, fullCard) {
  const numberVariant = normalizeNumberVariantForCard(stub.cardId, stub.numberVariant);
  const slot = {
    ...fullCard,
    variant: stub.variant,
    slotId: buildMasterSlotId(stub.cardId, stub.variant, numberVariant),
  };

  if (numberVariant) {
    slot.numberVariant = numberVariant;
    slot.number = setDisplayNumberVariant(fullCard.number, numberVariant);
  } else {
    delete slot.numberVariant;
    if (normalizeNumberVariant(fullCard.numberVariant)) {
      slot.number = setDisplayNumberVariant(fullCard.number, '');
    }
  }

  return slot;
}

export {
  buildMasterSlotId,
  compactMasterSlot,
  expandCompactMasterSlot,
  hydrateMasterSlot,
  normalizeNumberVariant,
  numberVariantsForCard,
  setDisplayNumberVariant,
};
