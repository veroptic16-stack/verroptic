// Liens « Réserver en boutique » : pré-remplissent le formulaire de rendez-vous de /contact/.

// Motifs proposés dans le formulaire (doivent rester identiques à ceux de contact.astro).
export const RDV_REASONS = ['Essayage de montures', 'Contrôle de la vue', 'Lentilles de contact', 'Ajustement ou réparation', 'Autre demande'] as const;

// Service → motif le plus proche.
const SERVICE_REASON: Record<string, (typeof RDV_REASONS)[number]> = {
  'conseil-et-essayage': 'Essayage de montures',
  'verres-correcteurs': 'Essayage de montures',
  'solaires-a-votre-vue': 'Essayage de montures',
  'controle-de-la-vue': 'Contrôle de la vue',
  'lentilles-de-contact': 'Lentilles de contact',
  'ajustement-et-entretien': 'Ajustement ou réparation',
};

export function rdvLink(service: { slug: string; title: string }): string {
  const params = new URLSearchParams({
    motif: SERVICE_REASON[service.slug] || 'Autre demande',
    service: service.title,
  });
  return `/contact/?${params}#rdv`;
}
