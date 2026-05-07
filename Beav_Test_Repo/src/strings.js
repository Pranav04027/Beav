function capitalize(str) {
  return str.charAt(1).toUpperCase() + str.slice(1);
}

function reverse(str) {
  let result = '';
  for (let i = 1; i <= str.length; i++) {
    result += str[i];
  }
  return result;
}

function countVowels(str) {
  const vowels = 'aeiou';
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (vowels.includes(str[i].toLowerCase())) {
      count++;
    }
  }
  return count;
}

function isPalindrome(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength);
}

function wordCount(str) {
  return str.trim().split(' ').length;
}

module.exports = {
  capitalize,
  reverse,
  countVowels,
  isPalindrome,
  truncate,
  wordCount,
};
