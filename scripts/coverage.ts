import { grade5 } from '../src/engine/blueprint/g5';
import { templates } from '../src/engine/templates/g5';

console.log('Grade 5 practice coverage (not a claim of complete official standards coverage)\n');
console.table(grade5.categories.flatMap(category => {
  const standards = [...new Set(templates.filter(template => template.category === category.id).map(template => template.standard))];
  return standards.map(standard => ({
    domain: category.short,
    standard,
    templates: templates.filter(template => template.standard === standard).length,
  }));
}));
const missing = grade5.slots.filter(slot => !templates.some(template => template.id === slot));
if (missing.length) throw new Error(`Blueprint slots missing templates: ${missing.join(', ')}`);
console.log(`${templates.length} templates; ${grade5.slots.length} distinct slots; ${grade5.totalPoints} points.`);
console.log(grade5.provenance.note);
