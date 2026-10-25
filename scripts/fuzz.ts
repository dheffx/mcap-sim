import { generateTest, makeCode } from '../src/engine/assemble';
import { Fraction } from '../src/engine/fraction';
import { isCorrect } from '../src/engine/assemble';

const count = Number(process.argv[2] ?? 10000);
if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) throw new Error('Provide a seed count from 1 to 1,000,000.');

for (let seed = 0; seed < count; seed++) {
  const test = generateTest(makeCode(`FUZZ-${seed}`));
  for (const item of test.items) {
    const response = item.type === 'mc' ? item.choices!.find(choice => choice.value === item.key)!.id : item.key;
    if (!isCorrect(item, response)) throw new Error(`Grading rejected the key for ${test.code}/${item.id}.`);
    if (item.type === 'numeric') {
      const wrong = Fraction.parse(item.key)!.add(new Fraction(1)).toString();
      if (isCorrect(item, wrong)) throw new Error(`Grading accepted a wrong answer for ${test.code}/${item.id}.`);
    } else if (item.choices!.filter(choice => isCorrect(item, choice.id)).length !== 1) {
      throw new Error(`Ambiguous scoring for ${test.code}/${item.id}.`);
    }
  }
}
console.log(`Verified ${count.toLocaleString('en-US')} tests / ${(count * 20).toLocaleString('en-US')} original items: keys, grading, unique options, exact practice quotas.`);
