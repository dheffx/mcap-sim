import { assessments } from './assessments';
import { Fraction } from './fraction';
import { Rng, slotRng } from './rng';
import { numericChoices } from './templates/g5';
import { allTemplates } from './templates';
import type { GeneratedTest, Item } from './types';
import { verifyItem } from './verify';
import { verifyChoiceQuality } from './choice-quality';
import { generateReviewedDraft } from './templates/reviewed';
import { generateVariedDraft } from './templates/varied';

export const GENERATOR_VERSION = 'v3';
export const SUPPORTED_GENERATOR_VERSIONS = ['v1', 'v2', 'v3'] as const;
type GeneratorVersion = typeof SUPPORTED_GENERATOR_VERSIONS[number];

export function makeCode(seed: string, assessmentId = 'g5', version: GeneratorVersion = GENERATOR_VERSION): string {
  const normalized = seed.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(normalized)) {
    throw new Error('Use 1–40 letters, numbers, hyphens, or underscores for your seed.');
  }
  const assessment = assessments.find(entry => entry.id === assessmentId);
  if (!assessment?.blueprint || assessment.status !== 'available') {
    throw new Error('This assessment is not available yet.');
  }
  return `${normalized}.${assessment.id}.${assessment.blueprint.id}.${version}`;
}

export function generateTest(code: string): GeneratedTest {
  const parts = code.split('.');
  if (parts.length !== 4) throw new Error(`This test code is incomplete. Expected SEED.g5.p1.${GENERATOR_VERSION}.`);
  const [seed, assessmentId, blueprintId, version] = parts;
  if (version !== 'v1' && version !== 'v2' && version !== 'v3') throw new Error(`Generator "${version}" is not supported. This app supports ${SUPPORTED_GENERATOR_VERSIONS.join(', ')}. Your saved test has not been changed.`);
  const assessment = assessments.find(entry => entry.id === assessmentId);
  if (!assessment?.blueprint || assessment.status !== 'available') throw new Error('This assessment is not available yet.');
  const blueprint = assessment.blueprint;
  if (blueprintId !== blueprint.id) throw new Error(`Blueprint "${blueprintId}" is not supported. Choose a new practice test from the home page.`);
  const canonicalCode = makeCode(seed!, assessment.id, version);
  const items: Item[] = blueprint.slots.map((templateId, index) => {
    const template = allTemplates.find(entry => entry.id === templateId);
    if (!template) throw new Error(`Missing template: ${templateId}`);
    const draft = version === 'v1'
      ? template.generate(slotRng(canonicalCode, index))
      : version === 'v2'
        ? generateReviewedDraft(template, slotRng(canonicalCode, index), blueprint.allowNegativeChoices)
        : generateVariedDraft(template, slotRng(canonicalCode, index), blueprint.allowNegativeChoices);
    if (version !== 'v1' && template.type === 'mc' && !draft.choices) throw new Error(`Missing reviewed choices for ${templateId}.`);
    const choices = template.type === 'mc'
      ? numericChoices(draft, slotRng(canonicalCode, index, 'options'), blueprint.allowNegativeChoices).map((choice, i) => ({ ...choice, id: String.fromCharCode(65 + i) }))
      : undefined;
    const { answer, distractors: _distractors, choices: _choices, ...content } = draft;
    void _distractors;
    void _choices;
    const item: Item = {
      ...content,
      id: `q${index + 1}`,
      templateId: template.id,
      category: blueprint.categoryOverrides?.[template.id] ?? template.category,
      standard: template.standard,
      difficulty: template.difficulty,
      type: template.type,
      points: 1,
      key: answer.toString(),
      choices,
    };
    verifyItem(item);
    if (version !== 'v1') verifyChoiceQuality(item);
    return item;
  });
  const ordered = version === 'v3'
    ? new Rng(`${canonicalCode}:question-order`).shuffle(items).map((item, index) => ({ ...item, id: `q${index + 1}` }))
    : items;
  const test = { code: canonicalCode, seed: canonicalCode.split('.')[0]!, blueprint, items: ordered };
  assertDistribution(test);
  return test;
}

export function distribution(test: GeneratedTest) {
  return {
    categories: test.blueprint.categories.map(category => ({
      ...category, actual: test.items.filter(item => item.category === category.id).length,
    })),
    types: {
      mc: test.items.filter(item => item.type === 'mc').length,
      numeric: test.items.filter(item => item.type === 'numeric').length,
    },
    difficulties: [1, 2, 3].map(tier => ({ tier, count: test.items.filter(item => item.difficulty === tier).length })),
    points: test.items.reduce((sum, item) => sum + item.points, 0),
  };
}

export function assertDistribution(test: GeneratedTest): void {
  const report = distribution(test);
  if (report.categories.some(category => category.count !== category.actual) ||
      report.types.mc !== test.blueprint.typeCounts.mc ||
      report.types.numeric !== test.blueprint.typeCounts.numeric ||
      report.difficulties.some(({ tier, count }) => count !== test.blueprint.difficultyCounts[tier as 1 | 2 | 3]) ||
      report.points !== test.blueprint.totalPoints ||
      new Set(test.items.map(item => item.templateId)).size !== test.items.length) {
    throw new Error('Generated test does not match its practice blueprint.');
  }
}

export function isCorrect(item: Item, response: string): boolean {
  if (item.type === 'mc') return item.choices?.find(choice => choice.id === response)?.value === item.key;
  const answer = Fraction.parse(response);
  const key = Fraction.parse(item.key);
  return answer !== null && key !== null && answer.equals(key);
}

export function answerLabel(item: Item): string {
  return item.type === 'mc' ? item.choices!.find(choice => choice.value === item.key)!.label : item.key;
}
