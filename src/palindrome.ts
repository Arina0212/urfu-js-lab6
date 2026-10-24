/**
 * Поиск палиндрома наибольшей длины в строке — на основе суффиксного дерева.
 *
 * Идея. Палиндром — это подстрока, которая читается одинаково в обе стороны,
 * то есть кусок строки S, совпадающий с таким же куском перевёрнутой строки R.
 * Каждый палиндром имеет центр: либо символ (нечётная длина), либо промежуток
 * между символами (чётная). Центров всего 2n − 1, и для каждого нужно узнать,
 * насколько далеко от него расходятся одинаковые символы.
 *
 * «Насколько далеко совпадают» — это длина наибольшего общего префикса двух
 * суффиксов, то есть запрос LCE (longest common extension). Если построить
 * суффиксное дерево строки
 *
 *     T = S + '#' + R + '$'        (R — развёрнутая S)
 *
 * то LCE считается как глубина наименьшего общего предка двух листьев за O(1)
 * (см. suffixTree.ts). Разделители '#' и '$' уникальны, поэтому совпадение
 * никогда не «перетечёт» из одной половины T в другую.
 *
 * Соответствие индексов: R[j] = S[n−1−j], а R в T начинается с позиции n+1.
 * Для центра i:
 *   нечётный палиндром: k = lce(i + 1, 2n + 1 − i), длина 2k + 1, начало i − k;
 *   чётный палиндром:   k = lce(i, 2n + 1 − i),     длина 2k,     начало i − k.
 *
 * Сложность:
 *   построение дерева   O(n^2) наивным алгоритмом (узкое место)
 *   предобработка LCA   O(n log n)
 *   перебор центров     O(n), по O(1) на центр
 *   память              O(n) на дерево + O(n log n) на таблицу LCA
 *
 */

import { SuffixTree } from './suffixTree.js';

export interface PalindromeResult {
    /** Сам палиндром. */
    value: string;
    /** Индекс начала в исходной строке. */
    start: number;
    /** Длина палиндрома. */
    length: number;
}

export function longestPalindrome(source: string): PalindromeResult {
    const n = source.length;
    if (n === 0) return { value: '', start: 0, length: 0 };

    const reversed = [...source].reverse().join('');
    const tree = new SuffixTree(`${source}#${reversed}`, '$');

    let bestStart = 0;
    let bestLength = 1;

    for (let center = 0; center < n; center++) {
        // нечётная длина: центр — сам символ source[center]
        const oddRadius = center + 1 < n
            ? tree.lce(center + 1, 2 * n + 1 - center)
            : 0;
        const oddLength = 2 * oddRadius + 1;

        if (oddLength > bestLength) {
            bestLength = oddLength;
            bestStart = center - oddRadius;
        }

        // чётная длина: центр — промежуток перед символом source[center]
        if (center > 0) {
            const evenRadius = tree.lce(center, 2 * n + 1 - center);
            const evenLength = 2 * evenRadius;

            if (evenLength > bestLength) {
                bestLength = evenLength;
                bestStart = center - evenRadius;
            }
        }
    }

    return {
        value: source.slice(bestStart, bestStart + bestLength),
        start: bestStart,
        length: bestLength,
    };
}
