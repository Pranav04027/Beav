const assert = require('assert');
const {
  add,
  subtract,
  multiply,
  divide,
  average,
  factorial,
  power,
  absolute,
  capitalize,
  reverse,
  countVowels,
  isPalindrome,
  truncate,
  wordCount,
  unique,
  flatten,
  chunk,
  removeDuplicates,
  sum,
  max,
  min,
} = require('../src');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL: ${name}`);
    console.error(`    Expected: ${error.expected}`);
    console.error(`    Got: ${error.actual}`);
    failed++;
  }
}

console.log('\n=== Calculator Tests ===');

test('add(2, 3) should return 5', () => {
  const result = add(2, 3);
  if (result !== 5) throw { expected: 5, actual: result };
});

test('add(-1, 1) should return 0', () => {
  const result = add(-1, 1);
  if (result !== 0) throw { expected: 0, actual: result };
});

test('subtract(10, 4) should return 6', () => {
  const result = subtract(10, 4);
  if (result !== 6) throw { expected: 6, actual: result };
});

test('subtract(5, 5) should return 0', () => {
  const result = subtract(5, 5);
  if (result !== 0) throw { expected: 0, actual: result };
});

test('multiply(3, 4) should return 12', () => {
  const result = multiply(3, 4);
  if (result !== 12) throw { expected: 12, actual: result };
});

test('multiply(0, 100) should return 0', () => {
  const result = multiply(0, 100);
  if (result !== 0) throw { expected: 0, actual: result };
});

test('divide(10, 2) should return 5', () => {
  const result = divide(10, 2);
  if (result !== 5) throw { expected: 5, actual: result };
});

test('average([1, 2, 3, 4, 5]) should return 3', () => {
  const result = average([1, 2, 3, 4, 5]);
  if (result !== 3) throw { expected: 3, actual: result };
});

test('average([10, 20]) should return 15', () => {
  const result = average([10, 20]);
  if (result !== 15) throw { expected: 15, actual: result };
});

test('average([]) should return 0', () => {
  const result = average([]);
  if (result !== 0) throw { expected: 0, actual: result };
});

test('factorial(5) should return 120', () => {
  const result = factorial(5);
  if (result !== 120) throw { expected: 120, actual: result };
});

test('factorial(0) should return 1', () => {
  const result = factorial(0);
  if (result !== 1) throw { expected: 1, actual: result };
});

test('factorial(-1) should return -1', () => {
  const result = factorial(-1);
  if (result !== -1) throw { expected: -1, actual: result };
});

test('power(2, 3) should return 8', () => {
  const result = power(2, 3);
  if (result !== 8) throw { expected: 8, actual: result };
});

test('absolute(-5) should return 5', () => {
  const result = absolute(-5);
  if (result !== 5) throw { expected: 5, actual: result };
});

console.log('\n=== String Tests ===');

test('capitalize("hello") should return "Hello"', () => {
  const result = capitalize('hello');
  if (result !== 'Hello') throw { expected: 'Hello', actual: result };
});

test('capitalize("world") should return "World"', () => {
  const result = capitalize('world');
  if (result !== 'World') throw { expected: 'World', actual: result };
});

test('reverse("hello") should return "olleh"', () => {
  const result = reverse('hello');
  if (result !== 'olleh') throw { expected: 'olleh', actual: result };
});

test('reverse("ab") should return "ba"', () => {
  const result = reverse('ab');
  if (result !== 'ba') throw { expected: 'ba', actual: result };
});

test('countVowels("hello") should return 2', () => {
  const result = countVowels('hello');
  if (result !== 2) throw { expected: 2, actual: result };
});

test('countVowels("AEIOU") should return 5', () => {
  const result = countVowels('AEIOU');
  if (result !== 5) throw { expected: 5, actual: result };
});

test('isPalindrome("racecar") should return true', () => {
  const result = isPalindrome('racecar');
  if (result !== true) throw { expected: true, actual: result };
});

test('isPalindrome("hello") should return false', () => {
  const result = isPalindrome('hello');
  if (result !== false) throw { expected: false, actual: result };
});

test('truncate("hello world", 5) should return "hello..."', () => {
  const result = truncate('hello world', 5);
  if (result !== 'hello...') throw { expected: 'hello...', actual: result };
});

test('truncate("hi", 10) should return "hi"', () => {
  const result = truncate('hi', 10);
  if (result !== 'hi') throw { expected: 'hi', actual: result };
});

test('wordCount("hello world") should return 2', () => {
  const result = wordCount('hello world');
  if (result !== 2) throw { expected: 2, actual: result };
});

console.log('\n=== Array Tests ===');

test('removeDuplicates([1, 2, 2, 3, 3, 3]) should return [1, 2, 3]', () => {
  const result = removeDuplicates([1, 2, 2, 3, 3, 3]);
  if (JSON.stringify(result) !== JSON.stringify([1, 2, 3])) throw { expected: '[1,2,3]', actual: JSON.stringify(result) };
});

test('unique([1, 2, 2, 3]) should return [1]', () => {
  const result = unique([1, 2, 2, 3]);
  if (JSON.stringify(result) !== JSON.stringify([1])) throw { expected: '[1]', actual: JSON.stringify(result) };
});

test('flatten([[1, 2], [3, 4]]) should return [1, 2, 3, 4]', () => {
  const result = flatten([[1, 2], [3, 4]]);
  if (JSON.stringify(result) !== JSON.stringify([1, 2, 3, 4])) throw { expected: '[1,2,3,4]', actual: JSON.stringify(result) };
});

test('chunk([1, 2, 3, 4, 5], 2) should return [[1,2],[3,4],[5]]', () => {
  const result = chunk([1, 2, 3, 4, 5], 2);
  if (JSON.stringify(result) !== JSON.stringify([[1, 2], [3, 4], [5]])) throw { expected: '[[1,2],[3,4],[5]]', actual: JSON.stringify(result) };
});

test('sum([1, 2, 3, 4]) should return 10', () => {
  const result = sum([1, 2, 3, 4]);
  if (result !== 10) throw { expected: 10, actual: result };
});

test('sum([]) should return 0', () => {
  const result = sum([]);
  if (result !== 0) throw { expected: 0, actual: result };
});

test('max([1, 5, 2, 8, 3]) should return 8', () => {
  const result = max([1, 5, 2, 8, 3]);
  if (result !== 8) throw { expected: 8, actual: result };
});

test('min([1, 5, 2, 8, 3]) should return 1', () => {
  const result = min([1, 5, 2, 8, 3]);
  if (result !== 1) throw { expected: 1, actual: result };
});

console.log('\n=== Summary ===');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
