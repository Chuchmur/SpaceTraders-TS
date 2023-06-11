const array = ["a", "b", "c"];

const repeat = (arr: any[], n: number) => Array(n).fill(arr).flat();

console.log(repeat(array, 3));
