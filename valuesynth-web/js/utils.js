export function formatNumber(value)
{
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
}

export function camelCaseToStandard(str) {
    if (!str) return '';
    return str.match(/[A-Za-z][a-z]*/g).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function camelCaseToStandardAllCaps(str) {
    if (!str) return '';
    return str.match(/[A-Za-z][a-z]*/g).map(word => word.toUpperCase()).join(' ');
}


export function getNumbersFromString(str) {
    return str ? str.match(/\d+(\.\d+)?/g).map(Number) : [];
}

export function getNumberFromString(str) {
    const match = str ? str.match(/\d+/) : null;
    return match ? parseInt(match[0], 10) : null;
}

export function isPrime(num) {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
        if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
}

const wordRegex = /^[a-z]+|[A-Z][a-z]*/;
const lastWordRegex = /([A-Z][a-z]*|[A-Z]+(?![a-z]))$/;

export function removeFirstWord(str) {
    return str ? str.replace(wordRegex, '') : '';
}

export function removeLastWord(str) {
    return str ? str.replace(lastWordRegex, '') : '';
}

export function getFirstWord(str) {
    const match = str ? str.match(wordRegex) : null;
    return match ? match[0] : '';
}

export function getLastWord(str) {
    const match = str ? str.match(lastWordRegex) : null;
    return match ? match[0] : '';
}

export function capitalizeFirstLetter(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function calcTargetValuesRanges(array) {
    return array.map(value => {
        const variance = value * 0.00445; // 0.445% of the value
        return { min: value - variance, max: value + variance };
    });
} 

export function checkValueWithinRange(value, array) {
    return array.some(range => value >= range.min && value <= range.max);
}

export function findClosestValue(value, array) {
    return array.reduce((prev, curr) => Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev);
}

export function generateWhiteKeys() {
    const whiteKeys = [];
    for (let i = 0; i < 128; i++) {
        if ([0, 2, 4, 5, 7, 9, 11].includes(i % 12)) {
            whiteKeys.push(i);
        }
    }
    return whiteKeys;
}

export function getRandomValues(sourceValues, numberOfValues) {
    const randomValues = new Set();
    while (randomValues.size < numberOfValues) {
        randomValues.add(sourceValues[Math.floor(Math.random() * sourceValues.length)]);
    }
    return [...randomValues].sort((a, b) => a - b);
}

export function removeItemsFromArray(array, itemsToRemove) {
    return array.filter(item => !itemsToRemove.includes(item));
}