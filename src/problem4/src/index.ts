// Demo
console.log("sum_to_n_a(5): ", sum_to_n_a(5));
console.log("sum_to_n_b(5): ", sum_to_n_b(5));
console.log("sum_to_n_c(5): ", sum_to_n_c(5));

/**
 Time Complexity => O(n)
 Space Complexity => O(1)
 */
function sum_to_n_a(n: number): number {
  // I assume n is a positive integer based on the problem description.
  if (n < 1) {
    return 0;
  }

  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

/**
 Time Complexity => O(1)
 Space Complexity => O(1)
 */
function sum_to_n_b(n: number): number {
  // I assume n is a positive integer based on the problem description.

  if (n < 1) {
    return 0;
  }

  // Use the Gaussian formula: n * (n + 1) / 2
  return (n * (n + 1)) / 2;
}

/**
 Time Complexity => O(n)
 Space Complexity => O(n)
 */
function sum_to_n_c(n: number): number {
  // Base Case, this is going to stop recursion
  if (n <= 0) {
    return 0;
  }

  // Recursive calling
  return n + sum_to_n_c(n - 1);
}
