export const formatDate = (isoDate) => new Date(isoDate).toLocaleString('de-CH');

export const formatCHF = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(Number(value));
};
