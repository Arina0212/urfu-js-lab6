import { SuffixTree } from './suffixTree.js';
import { longestPalindrome } from './palindrome.js';

console.log('Задание 2. Суффиксное дерево');

const text = 'мамамылараму';
const tree = new SuffixTree(text);

console.log('строка:', text, '| длина n =', text.length);
console.log('узлов в дереве:', tree.nodeCount, '(в сжатом дереве их всегда меньше 2n)');

console.log('\nпоиск подстроки:');
for (const pattern of ['мам', 'мыла', 'раму', 'мало']) {
    console.log(`  contains("${pattern}") = ${tree.contains(pattern)}`);
}

console.log('\nсколько раз встречается подстрока:');
for (const pattern of ['ма', 'мам', 'а', 'л']) {
    console.log(`  countOccurrences("${pattern}") = ${tree.countOccurrences(pattern)}`);
}

console.log('\nнаибольшее общее расширение суффиксов (LCE):');
console.log('  суффиксы с позиций 0 ("мамамылараму") и 2 ("мамылараму"):', tree.lce(0, 2));
console.log('  суффиксы с позиций 0 и 1:', tree.lce(0, 1));

console.log('\nЗадание 3. Наибольший палиндром');

const samples = [
    'топот',
    'мамамылараму',
    'арозаупаланалапуазора',
    'нашалашедолгостоялшалаш',
    'abacabadabacaba',
    'abcdefg',
    'aaaa',
    '',
];

for (const sample of samples) {
    const result = longestPalindrome(sample);
    console.log(`  "${sample}"`);
    console.log(`     -> "${result.value}" (длина ${result.length}, начало ${result.start})`);
}
