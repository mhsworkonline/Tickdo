import type { CatalogEntry } from '@/features/catalog/catalog';

/**
 * TEST FIXTURE ONLY — not shipped and not a medicine list. Generic (INN) names are used so tests
 * do not depend on the licensed catalogue the product owner will supply.
 */
export const FIXTURE_CATALOG: CatalogEntry[] = [
  ['paracetamol', 'Paracetamol', '500 mg', 'tablet'],
  ['amoxicillin', 'Amoxicillin', '500 mg', 'capsule'],
  ['metformin', 'Metformin', '500 mg', 'tablet'],
  ['cetirizine', 'Cetirizine', '10 mg', 'tablet'],
  ['pantoprazole', 'Pantoprazole', '40 mg', 'tablet'],
  ['azithromycin', 'Azithromycin', '500 mg', 'tablet'],
  ['amlodipine', 'Amlodipine', '5 mg', 'tablet'],
  ['atorvastatin', 'Atorvastatin', '10 mg', 'tablet'],
  ['telmisartan', 'Telmisartan', '40 mg', 'tablet'],
  ['ibuprofen', 'Ibuprofen', '400 mg', 'tablet'],
  ['ondansetron', 'Ondansetron', '4 mg', 'tablet'],
  ['salbutamol', 'Salbutamol', '100 mcg', 'inhaler'],
  ['vitamin-d3', 'Cholecalciferol', '60000 IU', 'capsule'],
  ['domperidone', 'Domperidone', '10 mg', 'tablet'],
].map(([id, salt, strength, form]) => ({ id: id as string, brand: null, salt: salt as string, strength: strength as string, form: form as string }));
