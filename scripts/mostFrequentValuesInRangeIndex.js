const fieldName = 'anyPrimaryName';
const numberOfValues = 100;

const top = [];
for (let val of fn.subsequence(
  cts.fieldValues(fieldName, null, ['frequency-order']),
  1,
  numberOfValues
)) {
  top.push({
    val,
    frequency: cts.frequency(val),
  });
}
top;
