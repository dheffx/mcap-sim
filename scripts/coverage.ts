import { assessments } from '../src/engine/assessments';
import { allTemplates } from '../src/engine/templates';

for (const assessment of assessments) {
  const blueprint = assessment.blueprint!;
  const templates = allTemplates.filter(template => blueprint.slots.includes(template.id));
  console.log(`\n${blueprint.title} (not a claim of complete official standards coverage)\n`);
  const missing = blueprint.slots.filter(slot => !templates.some(template => template.id === slot));
  if (missing.length) throw new Error(`Blueprint slots missing templates: ${missing.join(', ')}`);
  console.table(blueprint.categories.flatMap(category => {
    const inCategory = templates.filter(template => (blueprint.categoryOverrides?.[template.id] ?? template.category) === category.id);
    const standards = [...new Set(inCategory.map(template => template.standard))];
    return standards.map(standard => ({
      category: category.short,
      standard,
      templates: inCategory.filter(template => template.standard === standard).length,
    }));
  }));
  console.log(`${templates.length} templates; ${blueprint.slots.length} slots; ${blueprint.totalPoints} points.`);
  console.log(blueprint.provenance.note);
}
console.log(`\n${allTemplates.length} unique templates across ${assessments.length} practice forms.`);
