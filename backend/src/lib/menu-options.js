export const RASTA_PASTA_OPTION_GROUPS = [
  {
    id: 'protein',
    label: 'PROTEIN OPTIONS',
    type: 'radio',
    required: false,
    maxPick: 1,
    options: [
      { id: 'none', label: 'No Extra Protein', priceCents: 0, available: true },
      { id: 'chicken', label: 'Chicken', priceCents: 500, available: true },
      { id: 'shrimp', label: 'Shrimp', priceCents: 600, available: true },
      { id: 'steak', label: 'Steak', priceCents: 700, available: true },
      { id: 'lobster', label: 'Lobster', priceCents: 1200, available: true }
    ]
  }
];
