"use strict";
const array = ["a", "b", "c"];
const repeat = (arr, n) => Array(n).fill(arr).flat();
console.log(repeat(array, 3));
