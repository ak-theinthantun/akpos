export function toBoolean(value: number) {
  return value === 1;
}

export function toSqlBoolean(value: boolean) {
  return value ? 1 : 0;
}
